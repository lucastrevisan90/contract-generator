import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ShieldAlert, Loader2, Info, ArrowLeft, User, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export const LoginView: React.FC = () => {
    const { signIn, signUp, updatePassword, profile, error: authError, loading, resetPassword, isRecoveryMode } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState('');
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password' | 'forgot-user' | 'update-password'>('login');
    const [forgotEmail, setForgotEmail] = useState('');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Visibility toggles
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Initial check for recovery mode
    useEffect(() => {
        if (isRecoveryMode || window.location.hash.includes('type=recovery')) {
            setMode('update-password');
        }
    }, [isRecoveryMode]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');
        try {
            await signIn(email, password);
        } catch (err: any) {
            // Error managed by store
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');
        if (password.length < 6) {
            setLocalError('A senha deve ter pelo menos 6 caracteres');
            return;
        }
        try {
            await signUp(email, password, fullName);
            // If the user is logged in automatically, the Store will update and App will move them forward.
            // If they need to confirm email, we show a message.
            const currentUser = useAuthStore.getState().user;
            if (currentUser) {
                setSuccessMessage('Conta criada! Entrando no sistema...');
            } else {
                setSuccessMessage('Conta criada com sucesso! Verifique seu e-mail para confirmar o acesso.');
                setMode('login');
            }
        } catch (err: any) {
            // Error managed by store
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');
        if (newPassword !== confirmPassword) {
            setLocalError('As senhas não coincidem');
            return;
        }
        if (newPassword.length < 6) {
            setLocalError('A senha deve ter pelo menos 6 caracteres');
            return;
        }
        try {
            await updatePassword(newPassword);
            // After successful update (which now also signs out in store),
            // move to login mode and show success message.
            setSuccessMessage('Senha alterada com sucesso! Faça login com seus novos dados.');
            setMode('login');
            window.location.hash = ''; // Clear hash
            // No reload needed if we just switch mode and show message, 
            // but if we want to be 100% sure of clean state:
            // window.location.reload(); 
        } catch (err: any) {
            // Error managed by store
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await resetPassword(forgotEmail);
            setSuccessMessage('E-mail de recuperação enviado!');
            setTimeout(() => {
                setMode('login');
                setSuccessMessage(null);
            }, 5000);
        } catch (err: any) {
            // Error managed by store
        }
    };

    const isInternalUpdateRequired = profile?.password_change_required;
    const showPasswordUpdate = isInternalUpdateRequired || mode === 'update-password';

    if (mode === 'forgot-password') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0.5, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl"
                >
                    <button
                        onClick={() => setMode('login')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors text-xs font-bold uppercase tracking-widest"
                    >
                        <ArrowLeft size={16} />
                        Voltar
                    </button>
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-500">
                            <Mail size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Recuperar Senha</h2>
                        <p className="text-slate-400 text-sm">Insira seu e-mail para receber um link de redefinição.</p>
                    </div>

                    {successMessage ? (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-xl text-sm font-medium text-center">
                            {successMessage}
                        </div>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">E-mail</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        placeholder="seu@email.com"
                                    />
                                </div>
                            </div>
                            {authError && <div className="text-red-500 text-xs px-2">{authError}</div>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Enviar Link'}
                            </button>
                        </form>
                    )}
                </motion.div>
            </div>
        );
    }

    if (mode === 'forgot-user') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0.5, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl"
                >
                    <button
                        onClick={() => setMode('login')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors text-xs font-bold uppercase tracking-widest"
                    >
                        <ArrowLeft size={16} />
                        Voltar
                    </button>
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-500">
                            <Info size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Esqueci meu Usuário</h2>
                        <p className="text-slate-400 text-sm">Saiba como recuperar seu acesso.</p>
                    </div>
                    <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl mb-6">
                        <p className="text-sm text-slate-300 leading-relaxed">
                            No **OitoH**, seu usuário é o seu e-mail cadastrado.
                            Caso não lembre qual e-mail foi utilizado, entre em contato com o seu **Administrador**.
                        </p>
                    </div>
                    <button
                        onClick={() => setMode('login')}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-all"
                    >
                        Entendido
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-blue-500/30">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-blue-500/5"
            >
                <div className="text-center mb-10">
                    <img src="/logo-8.png" alt="OitoH Logo" className="w-auto h-24 object-contain mx-auto mb-6 drop-shadow-2xl" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {showPasswordUpdate ? 'Atualizar Senha' : mode === 'signup' ? 'Criar sua conta' : 'Bem-vindo de volta'}
                    </h1>
                    <p className="text-slate-400 text-sm">
                        {showPasswordUpdate
                            ? 'Por favor, escolha uma senha segura para continuar.'
                            : mode === 'signup'
                                ? 'Junte-se ao melhor planner profissional.'
                                : 'Entre com suas credenciais para acessar seu planner.'}
                    </p>
                </div>

                {successMessage && mode === 'login' && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-xl text-xs font-medium text-center mb-6">
                        {successMessage}
                    </div>
                )}

                <form onSubmit={showPasswordUpdate ? handlePasswordChange : mode === 'signup' ? handleSignUp : handleLogin} className="space-y-5">
                    {showPasswordUpdate ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Nova Senha</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                    >
                                        {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Confirmar Senha</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {mode === 'signup' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Nome Completo</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            required
                                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                            placeholder="Seu Nome"
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">E-mail</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                        placeholder="seu@email.com"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Senha</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    <AnimatePresence>
                        {(authError || localError) && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs"
                            >
                                <ShieldAlert size={14} />
                                <span>{localError || authError}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            showPasswordUpdate ? 'Atualizar Senha' : mode === 'signup' ? 'Criar Conta' : 'Entrar na Conta'
                        )}
                    </button>

                    {!showPasswordUpdate && (
                        <div className="flex flex-col gap-3 pt-2">
                            {mode === 'login' ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setMode('signup')}
                                        className="text-blue-500 hover:text-blue-400 text-sm font-bold transition-colors w-fit mx-auto"
                                    >
                                        Não tem uma conta? Crie agora
                                    </button>
                                    <div className="flex gap-4 justify-center">
                                        <button
                                            type="button"
                                            onClick={() => setMode('forgot-password')}
                                            className="text-slate-500 hover:text-blue-500 text-xs font-semibold transition-colors"
                                        >
                                            Esqueci minha senha
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMode('forgot-user')}
                                            className="text-slate-500 hover:text-blue-500 text-xs font-semibold transition-colors"
                                        >
                                            Esqueci meu usuário
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setMode('login')}
                                    className="text-slate-500 hover:text-white text-sm font-bold transition-colors w-fit mx-auto"
                                >
                                    Já tem uma conta? Entrar
                                </button>
                            )}
                        </div>
                    )}

                    {/* Security Lock: If we are updating password from recovery link, dont show navigation */}
                    {showPasswordUpdate && !isRecoveryMode && (
                        <div className="flex flex-col gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="text-slate-500 hover:text-white text-sm font-bold transition-colors w-fit mx-auto"
                            >
                                Voltar para Login
                            </button>
                        </div>
                    )}
                </form>

                <div className="mt-8 text-center border-t border-slate-800/50 pt-6">
                    <p className="text-slate-500 text-[10px] tracking-widest font-normal" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        Oito<span className="font-bold">H</span> PLANNER
                    </p>
                </div>
            </motion.div>
        </div>
    );
};
