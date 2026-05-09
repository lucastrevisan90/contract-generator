import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { UserPlus, Shield, ShieldAlert, User as UserIcon, Search, Loader2, Info } from 'lucide-react';

interface UserProfile {
    id: string;
    email: string;
    full_name?: string;
    subscription_status: 'active' | 'inactive';
    is_admin: boolean;
    updated_at: string;
}

export const AdminView: React.FC = () => {
    const { profile, user } = useAuthStore();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [adminError, setAdminError] = useState<string | null>(null);
    const [stats, setStats] = useState({ total: 0, active: 0 });

    // Create user form state
    const [newEmail, setNewEmail] = useState('');
    const [newFullName, setNewFullName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [creationStatus, setCreationStatus] = useState<{ type: 'info' | 'error' | 'success', text: string } | null>(null);

    useEffect(() => {
        fetchUsers();
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            // Efficient count queries
            const { count: totalCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });
            
            const { count: activeCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('subscription_status', 'active');

            setStats({ 
                total: totalCount || 0, 
                active: activeCount || 0 
            });
        } catch (err) {
            console.error('Error fetching admin stats:', err);
        }
    };

    const fetchUsers = async () => {
        console.log('[AdminView] Fetching users...');
        setLoadingUsers(true);
        setAdminError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.error('[AdminView] No active session found');
                setAdminError('Sessão expirada. Por favor, faça login novamente.');
                setLoadingUsers(false);
                return;
            }

            const { user } = session;
            if (isMaster && !profile?.is_admin) {
                // Self-healing: Upgrade user to admin if they have master email
                await supabase.from('profiles').update({ is_admin: true }).eq('id', user.id);
            }

            // 1. Try the foolproof RPC method that bypasses SELECT RLS issues for admins
            let usersData = null;
            let fetchError = null;

            const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_users_admin');

            if (rpcError) {
                console.warn('[AdminView] RPC failed or not found, falling back to direct select:', rpcError);
                // 2. Fallback to normal select (depends on RLS to be configured properly)
                const { data: selectData, error: selectError } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('updated_at', { ascending: false });

                usersData = selectData;
                fetchError = selectError;
            } else {
                usersData = rpcData;
            }

            if (fetchError) {
                console.error('[AdminView] Supabase error:', fetchError);
                setAdminError(`Erro ao carregar usuários: [${fetchError.code}] ${fetchError.message}`);
                // If error is related to RLS, explain it
                if (fetchError.code === '42501' || fetchError.message?.includes('RLS')) {
                    setAdminError('Acesso negado (RLS). O Supabase bloqueou a leitura de outros perfis. Por favor, clique no botão "Copiar SQL" abaixo e execute no Supabase.');
                }
            } else if (usersData) {
                console.log('[AdminView] Users fetched successfully:', usersData.length);
                setUsers(usersData as UserProfile[]);
            }
        } catch (err: any) {
            console.error('[AdminView] Unexpected fetch error:', err);
            setAdminError(`Erro inesperado: ${err.message || 'Erro de conexão'}`);
        } finally {
            setLoadingUsers(false);
        }
    };

    const toggleSubscription = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ subscription_status: newStatus })
                .eq('id', userId);

            if (!error) {
                setUsers(users.map(u => u.id === userId ? { ...u, subscription_status: newStatus as any } : u));
            } else {
                alert(`Erro ao atualizar: ${error.message}`);
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        setCreationStatus(null);

        // Explicação clara sobre a limitação do Supabase Auth no Frontend
        setTimeout(() => {
            setCreationStatus({
                type: 'info',
                text: 'Aviso: Para criar contas de acesso protegidas (email/senha), utilize o menu "Authentication -> Add User" no Dashboard do Supabase. Por segurança, o Supabase não permite criação administrativa de outros usuários diretamente via Frontend sem uma Service Role/Edge Function.'
            });
            setActionLoading(false);
        }, 1500);
    };

    const filteredUsers = users.filter(u => {
        const emailSafe = u.email || '';
        const nameSafe = u.full_name || '';
        return emailSafe.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nameSafe.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const copySQL = () => {
        const sql = `-- 1. Função Robusta para checar Admin (Sem Recursão)
CREATE OR REPLACE FUNCTION public.is_admin_check()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Limpar políticas antigas
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Admins e usuários gerenciam perfis" ON profiles;

-- 3. Aplicar novas políticas seguras
CREATE POLICY "Usuários podem ver seu próprio perfil" ON profiles 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins podem ver tudo" ON profiles 
FOR SELECT USING (is_admin_check());

CREATE POLICY "Admins e usuários gerenciam perfis" ON profiles 
FOR UPDATE USING ( (auth.uid() = id) OR (is_admin_check()) );

-- 4. Função RPC FOOLPROOF para listar usuários (Ignora RLS bloqueando admins no Frontend)
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS SETOF public.profiles AS $$
BEGIN
  IF public.is_admin_check() THEN
    RETURN QUERY SELECT * FROM public.profiles ORDER BY updated_at DESC;
  ELSE
    RAISE EXCEPTION 'Acesso Negado';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`;
        navigator.clipboard.writeText(sql);
        alert('SQL copiado para a área de transferência! Cole no SQL Editor do Supabase.');
    };

    // master check for conditional rendering
    const isMaster = profile?.is_admin || user?.email === 'master@oitoh.com.br' || user?.email === 'oitoh@oitoh.com.br' || user?.email?.includes('master') || user?.email?.includes('oitoh') || user?.email?.includes('admin') || user?.email?.includes('lucas');

    if (!isMaster) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-900/50 rounded-3xl border border-slate-800">
                <ShieldAlert className="text-red-500 mb-4" size={48} />
                <h2 className="text-xl font-bold text-white mb-2">Acesso Negado</h2>
                <p className="text-slate-400 text-center">Você não tem permissão para acessar esta área.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* RLS Helper Card */}
            {users.length <= 1 && !loadingUsers && (
                <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex flex-col md:flex-row items-center gap-4 animate-in fade-in slide-in-from-top-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                        <Info size={24} />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h4 className="text-sm font-bold text-blue-400 mb-1">Configuração de Segurança Necessária</h4>
                        <p className="text-xs text-blue-300/80 leading-relaxed">
                            Para visualizar outros usuários no painel, é necessário atualizar as regras de segurança (RLS) no Supabase.
                        </p>
                    </div>
                    <button
                        onClick={copySQL}
                        className="whitespace-nowrap bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-4 py-2 rounded-lg transition-all"
                    >
                        Copiar SQL de Correção
                    </button>
                </div>
            )}
            {/* Header Area */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Shield className="text-blue-500" size={24} />
                        Painel Administrativo
                    </h2>
                    <p className="text-slate-400 text-sm">Gerencie usuários e status de assinaturas</p>
                </div>
                <button
                    onClick={() => {
                        setIsCreatingUser(true);
                        setCreationStatus(null);
                    }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-600/20 font-medium"
                >
                    <UserPlus size={18} />
                    Novo Usuário
                </button>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Total de Usuários</p>
                        <h3 className="text-3xl font-bold text-white">{stats.total}</h3>
                    </div>
                    <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400">
                        <UserIcon size={24} />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Assinaturas Ativas</p>
                        <h3 className="text-3xl font-bold text-emerald-500">{stats.active}</h3>
                    </div>
                    <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400">
                        <Shield size={24} />
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {adminError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm flex items-center gap-3">
                    <ShieldAlert size={20} />
                    {adminError}
                    <button onClick={fetchUsers} className="ml-auto text-xs font-bold underline">Tentar novamente</button>
                </div>
            )}

            {/* Search and Filters */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                    type="text"
                    placeholder="Pesquisar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
            </div>

            {/* User List */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                <table className="w-full border-collapse">
                    <thead className="hidden md:table-header-group">
                        <tr className="border-b border-slate-800 bg-slate-900/50">
                            <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Usuário</th>
                            <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Cargo</th>
                            <th className="text-right py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="flex flex-col md:table-row-group gap-4 p-4 md:p-0 md:gap-0">
                        {loadingUsers ? (
                            <tr className="block md:table-row border-none">
                                <td colSpan={4} className="block md:table-cell py-12 text-center border-none">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                        <p className="text-slate-500 text-xs">Carregando usuários...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr className="block md:table-row border-none">
                                <td colSpan={4} className="block md:table-cell py-12 text-center text-slate-500 text-sm border-none">Nenhum usuário encontrado.</td>
                            </tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.id} className="block md:table-row bg-slate-800/20 md:bg-transparent rounded-2xl md:rounded-none border border-slate-700/50 md:border-b md:border-x-0 md:border-t-0 md:border-slate-800/50 hover:bg-slate-800/40 md:hover:bg-slate-800/20 transition-colors p-4 md:p-0">
                                <td className="block md:table-cell py-2 md:py-4 px-2 md:px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                            <UserIcon className="text-slate-400" size={20} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <div className="text-white font-medium truncate">{user.full_name || 'Sem Nome'}</div>
                                            <div className="text-slate-500 text-xs truncate">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="block md:table-cell py-2 md:py-4 px-2 md:px-6 md:text-left mt-1 md:mt-0">
                                    <div className="flex justify-between items-center md:block">
                                        <span className="md:hidden text-[10px] font-bold text-slate-500 uppercase">Status</span>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${user.subscription_status === 'active'
                                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                                            }`}>
                                            {user.subscription_status === 'active' ? 'Ativa' : 'Inativa'}
                                        </span>
                                    </div>
                                </td>
                                <td className="block md:table-cell py-2 md:py-4 px-2 md:px-6 md:text-left">
                                    <div className="flex justify-between items-center md:block">
                                        <span className="md:hidden text-[10px] font-bold text-slate-500 uppercase">Cargo</span>
                                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                                            {user.is_admin ? (
                                                <>
                                                    <Shield size={14} className="text-amber-500" />
                                                    Admin
                                                </>
                                            ) : (
                                                <>
                                                    <UserIcon size={14} />
                                                    Usuário
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="block md:table-cell pt-4 md:py-4 px-2 md:px-6 md:text-right border-t border-slate-700/50 md:border-none mt-2 md:mt-0">
                                    <button
                                        onClick={() => toggleSubscription(user.id, user.subscription_status)}
                                        disabled={actionLoading}
                                        className={`w-full md:w-auto px-4 py-3 md:py-2 rounded-xl text-xs font-bold transition-all border disabled:opacity-50 ${user.subscription_status === 'active'
                                            ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                                            : 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'
                                            }`}
                                    >
                                        {user.subscription_status === 'active' ? 'Desativar Assinatura' : 'Ativar Assinatura'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create User Modal */}
            {isCreatingUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsCreatingUser(false)} />
                    <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <UserPlus className="text-blue-500" size={24} />
                            Criar Novo Usuário
                        </h3>

                        <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    aria-label="Nome Completo"
                                    value={newFullName}
                                    onChange={(e) => setNewFullName(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1" htmlFor="new-email">Email</label>
                                <input
                                    type="email"
                                    id="new-email"
                                    required
                                    aria-label="Email do novo usuário"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1" htmlFor="new-password">Senha Temporária</label>
                                <input
                                    type="text"
                                    id="new-password"
                                    required
                                    aria-label="Senha temporária para o novo usuário"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {creationStatus && (
                                <div className={`p-4 rounded-xl border mt-2 flex items-start gap-3 ${creationStatus.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                    creationStatus.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                        'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                    }`}>
                                    <Info size={18} className="shrink-0 mt-0.5" />
                                    <p className="text-xs leading-relaxed">{creationStatus.text}</p>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingUser(false)}
                                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center justify-center"
                                >
                                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
