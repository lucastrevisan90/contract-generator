import React, { useState } from 'react';
import { X, Volume2, Moon, Sun, Check, Download } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { SOUND_VARIANTS, SoundType } from '../../constants/audio';
import { AnimatePresence, motion } from 'framer-motion';
import { AudioManager } from '../../utils/AudioManager';
import { useTaskStore } from '../../store/useTaskStore';
import { useAuthStore } from '../../store/useAuthStore';
import { User, Lock, Save, Key, Eye, EyeOff } from 'lucide-react';
import { SmartDownload } from '../Common/SmartDownload';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const {
        theme, setTheme,
        soundEnabled, setSoundEnabled,
        volumes, setVolume,
        soundVariants, setSoundVariant
    } = useSettingsStore();

    const { profile, updateProfile, updatePassword } = useAuthStore();

    const [activeTab, setActiveTab] = useState<'audio' | 'theme' | 'profile' | 'app'>('audio');

    // Profile form state
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Sync state with profile data
    React.useEffect(() => {
        if (isOpen && profile) {
            setFullName(profile.full_name || '');
        }
    }, [isOpen, profile]);

    // Cleanup audio on unmount/close
    React.useEffect(() => {
        return () => {
            AudioManager.getInstance().stop();
        };
    }, []);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-background-secondary border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-border flex justify-between items-center bg-background-tertiary">
                        <h2 className="text-xl font-bold text-text-primary">Configurações</h2>
                        <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors" title="Fechar">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex overflow-x-auto border-b border-border pt-2 pb-0.5">
                        <button
                            onClick={() => setActiveTab('audio')}
                            className={`flex-1 min-w-[70px] py-3 text-sm font-medium transition-colors ${activeTab === 'audio' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary'}`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Volume2 size={18} />
                                <span className="hidden sm:inline">Áudio</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('theme')}
                            className={`flex-1 min-w-[70px] py-3 text-sm font-medium transition-colors ${activeTab === 'theme' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary'}`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                                <span className="hidden sm:inline">Aparência</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`flex-1 min-w-[70px] py-3 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary'}`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <User size={18} />
                                <span className="hidden sm:inline">Perfil</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('app')}
                            className={`flex-1 min-w-[70px] py-3 text-sm font-medium transition-colors ${activeTab === 'app' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary'}`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Download size={18} />
                                <span className="hidden sm:inline">App</span>
                            </div>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-background-primary">
                        {activeTab === 'audio' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-background-tertiary rounded-lg border border-border">
                                    <div>
                                        <h3 className="font-medium text-text-primary">Sons do Sistema</h3>
                                        <p className="text-xs text-text-secondary">Ativar ou desativar todos os efeitos sonoros</p>
                                    </div>
                                    <button
                                        onClick={() => setSoundEnabled(!soundEnabled)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${soundEnabled ? 'bg-accent' : 'bg-gray-600'}`}
                                        title={soundEnabled ? 'Desativar sons' : 'Ativar sons'}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${soundEnabled ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className={`space-y-6 ${!soundEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {(Object.keys(SOUND_VARIANTS) as SoundType[]).map((type) => (
                                        <div key={type} className="bg-background-secondary p-4 rounded-lg border border-border">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="font-medium text-text-primary capitalize">
                                                                {type === 'start' ? 'Início de Tarefa' :
                                                                type === 'overdue' ? 'Tarefa Atrasada' :
                                                                type === 'popup' ? 'Notificação' :
                                                                type === 'success' ? 'Sucesso' :
                                                                type === 'complete' ? 'Conclusão' :
                                                                type === 'pomodoro_start' ? 'Início Pomodoro' :
                                                                type === 'pomodoro_end' ? 'Pausa Pomodoro' :
                                                                type === 'pomodoro_complete' ? 'Fim da Sessão' :
                                                                    'Som'}
                                                </span>
                                                <span className="text-xs text-text-secondary">{Math.round(volumes[type] * 100)}%</span>
                                            </div>

                                            {/* Volume Slider */}
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={volumes[type]}
                                                onChange={(e) => setVolume(type, parseFloat(e.target.value))}
                                                aria-label={`Volume: ${type}`}
                                                className="w-full h-1.5 bg-background-tertiary rounded-lg appearance-none cursor-pointer mb-4 accent-accent"
                                            />

                                            {/* Variants */}
                                            <div className="grid grid-cols-3 gap-2">
                                                {Object.entries(SOUND_VARIANTS[type]).map(([variantId, variant]) => (
                                                    <button
                                                        key={variantId}
                                                        onClick={() => {
                                                            setSoundVariant(type, variantId);

                                                            // Use AudioManager for preview (auto-stops previous)
                                                            const gain = variant.gain ?? 1;
                                                            const finalVolume = Math.max(0, Math.min(1, volumes[type] * gain));
                                                            AudioManager.getInstance().play(variant.url, finalVolume);
                                                        }}
                                                        className={`relative flex flex-col items-center justify-center p-2 rounded-md border text-xs transition-all ${soundVariants[type] === variantId
                                                            ? 'border-accent bg-accent/10 text-accent font-medium'
                                                            : 'border-border bg-background-tertiary text-text-secondary hover:border-text-secondary'
                                                            }`}
                                                    >
                                                        {variant.label}
                                                        {soundVariants[type] === variantId && (
                                                            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'theme' && (
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === 'dark'
                                        ? 'border-accent bg-slate-900 ring-2 ring-accent ring-offset-2 ring-offset-background-primary'
                                        : 'border-border bg-slate-900 hover:border-text-secondary opacity-70 hover:opacity-100'
                                        }`}
                                >
                                    <div className="w-full h-24 bg-slate-950 rounded-lg flex items-center justify-center border border-slate-800">
                                        <Moon className="text-slate-400" size={32} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-white">Escuro</span>
                                        {theme === 'dark' && <Check size={16} className="text-accent" />}
                                    </div>
                                </button>

                                <button
                                    onClick={() => setTheme('light')}
                                    className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === 'light'
                                        ? 'border-accent bg-slate-50 ring-2 ring-accent ring-offset-2 ring-offset-background-primary'
                                        : 'border-border bg-slate-50 hover:border-text-secondary opacity-70 hover:opacity-100'
                                        }`}
                                >
                                    <div className="w-full h-24 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
                                        <Sun className="text-amber-500" size={32} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-900">Claro</span>
                                        {theme === 'light' && <Check size={16} className="text-accent" />}
                                    </div>
                                </button>
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                {/* Personalization */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <User size={14} />
                                        Personalização
                                    </h3>
                                    <div className="bg-background-secondary p-4 rounded-xl border border-border space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary mb-1">Seu Nome</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    placeholder="Como deseja ser chamado?"
                                                    className="flex-1 bg-background-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-accent outline-none"
                                                />
                                                <button
                                                    onClick={async () => {
                                                        setIsSaving(true);
                                                        try {
                                                            await updateProfile({ full_name: fullName });
                                                            setMessage({ type: 'success', text: 'Nome atualizado!' });
                                                        } catch (err: any) {
                                                            setMessage({ type: 'error', text: err.message });
                                                        }
                                                        setIsSaving(false);
                                                    }}
                                                    disabled={isSaving}
                                                    className="px-3 py-2 bg-accent text-white rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    <Save size={16} />
                                                    Salvar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Security */}
                                <div className="space-y-4 pt-4 border-t border-border">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Lock size={14} />
                                        Segurança
                                    </h3>
                                    <div className="bg-background-secondary p-4 rounded-xl border border-border space-y-4">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-medium text-text-secondary mb-1">Nova Senha</label>
                                                <div className="relative">
                                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        placeholder="Mínimo 6 caracteres"
                                                        className="w-full bg-background-tertiary border border-border rounded-lg pl-10 pr-10 py-2 text-sm text-text-primary focus:ring-2 focus:ring-accent outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-text-primary"
                                                    >
                                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-text-secondary mb-1">Confirmar Nova Senha</label>
                                                <div className="relative">
                                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                                    <input
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        placeholder="Repita a nova senha"
                                                        className="w-full bg-background-tertiary border border-border rounded-lg pl-10 pr-10 py-2 text-sm text-text-primary focus:ring-2 focus:ring-accent outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-text-primary"
                                                    >
                                                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <button
                                                onClick={async () => {
                                                    if (newPassword.length < 6) {
                                                        setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres' });
                                                        return;
                                                    }
                                                    if (newPassword !== confirmPassword) {
                                                        setMessage({ type: 'error', text: 'As senhas não coincidem' });
                                                        return;
                                                    }
                                                    setIsSaving(true);
                                                    try {
                                                        await updatePassword(newPassword);
                                                        setNewPassword('');
                                                        setConfirmPassword('');
                                                        setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
                                                    } catch (err: any) {
                                                        setMessage({ type: 'error', text: err.message });
                                                    }
                                                    setIsSaving(false);
                                                }}
                                                disabled={isSaving || !newPassword || !confirmPassword}
                                                className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 border border-slate-700"
                                            >
                                                <Lock size={16} />
                                                Alterar Senha
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Feedback Message */}
                                {message && (
                                    <div className={`p-3 rounded-lg text-xs font-medium text-center animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                        {message.text}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'app' && (
                            <div className="space-y-6">
                                <SmartDownload />
                                
                                {/* Danger Zone */}
                                <div className="pt-6 border-t border-red-500/20">
                                    <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4">Zona de Perigo</h4>
                                    <button
                                        onClick={() => {
                                            if (confirm('ATENÇÃO: Isso apagará TODAS as suas tarefas e hábitos permanentemente. Deseja continuar?')) {
                                                useTaskStore.getState().purgeAllData();
                                            }
                                        }}
                                        className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl font-semibold transition-all border border-red-500/20 flex items-center justify-center gap-2"
                                    >
                                        Limpeza Total do Sistema
                                    </button>
                                    <p className="text-[10px] text-slate-500 mt-2 text-center">
                                        Isso removerá dados locais e da nuvem. Use com cautela.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
