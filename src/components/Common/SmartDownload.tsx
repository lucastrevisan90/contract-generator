import React from 'react';
import { usePlatform } from '../../hooks/usePlatform';
import { Download, Smartphone, Monitor, Apple, Share, Plus, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// PWA Instructions for iOS
const PWA_INSTRUCTIONS_IOS = (
    <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 space-y-3"
    >
        <p className="font-bold text-white text-xs uppercase tracking-wider mb-2">Instalar no iPhone (3 Passos):</p>
        <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0 border border-blue-500/20">
                <Share size={14} className="text-blue-400" />
            </div>
            <span className="text-xs text-slate-300">1. Toque em <strong className="text-white">Compartilhar</strong> no menu inferior do Safari</span>
        </div>
        <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-indigo-500/10 rounded-lg flex items-center justify-center shrink-0 border border-indigo-500/20">
                <Plus size={14} className="text-indigo-400" />
            </div>
            <span className="text-xs text-slate-300">2. Escolha <strong className="text-white">Adicionar à Tela de Início</strong></span>
        </div>
        <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0 border border-emerald-500/20">
                <CheckCircle2 size={14} className="text-emerald-400" />
            </div>
            <span className="text-xs text-slate-300">3. Confirme tocando em <strong className="text-white">Adicionar</strong> no canto superior</span>
        </div>
    </motion.div>
);


export const SmartDownload: React.FC = () => {
    const { os } = usePlatform();
    const [installPrompt, setInstallPrompt] = React.useState<any>(null);
    const [showInstructions, setShowInstructions] = React.useState(false);

    // Capture the beforeinstallprompt event for seamless Android PWA install (if available)
    React.useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallPWA = async () => {
        if (installPrompt) {
            installPrompt.prompt();
            const result = await installPrompt.userChoice;
            if (result.outcome === 'accepted') {
                setInstallPrompt(null);
            }
        }
    };

    const isMobile = os === 'ios' || os === 'android';
    const isWindows = os === 'windows';

    return (
        <div className="space-y-6">

            {/* HERO CARD - Glassmorphism */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-900/40 via-slate-900/60 to-slate-900/80 backdrop-blur-md p-6 shadow-2xl">
                {/* Background Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/30 rounded-full blur-[60px] pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                    {/* Logo 8 */}
                    <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner overflow-hidden p-2">
                        <img src="/logo-8.png" alt="OitoH Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Leve o OitoH para todos os lugares</h2>
                        <p className="text-sm text-indigo-200/70 mt-1 max-w-[280px] mx-auto">
                            Produtividade sem limites. Sincronização em tempo real entre todos os seus dispositivos.
                        </p>
                    </div>

                    {/* SMART ACTION BUTTON */}
                    <div className="w-full pt-4 border-t border-white/10 mt-2">
                        {isWindows && (
                            <div className="space-y-3">
                                <a
                                    href="/OitoH-Setup.exe"
                                    download="OitoH-Setup.exe"
                                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group"
                                >
                                    <Monitor size={18} />
                                    <span>Baixar para Windows (.exe)</span>
                                    <Download size={16} className="group-hover:translate-y-1 transition-transform ml-1" />
                                </a>
                                <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Instalador Nativo • Mais rápido e integrado</p>
                            </div>
                        )}

                        {isMobile && (
                            <div className="space-y-3">
                                {os === 'android' ? (
                                    <>
                                        <a
                                            href="/OitoH-App.apk"
                                            download="OitoH-App.apk"
                                            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 group"
                                        >
                                            <Smartphone size={18} />
                                            <span>Baixar App Android (.apk)</span>
                                            <Download size={16} className="group-hover:translate-y-1 transition-transform ml-1" />
                                        </a>
                                        <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">App Nativo • Mais rápido e integrado</p>
                                    </>
                                ) : (
                                    <>
                                        {installPrompt ? (
                                            <button
                                                onClick={handleInstallPWA}
                                                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                                            >
                                                <Smartphone size={18} />
                                                Instalar Aplicativo (Automático)
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setShowInstructions(!showInstructions)}
                                                className="w-full py-3 px-4 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl font-bold text-sm transition-all flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Apple size={18} />
                                                    <span>Instalar na Tela de Início</span>
                                                </div>
                                                <ArrowRight size={16} className={`transition-transform duration-300 ${showInstructions ? 'rotate-90' : ''}`} />
                                            </button>
                                        )}
                                        <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Acesso rápido sem precisar digitar a URL</p>

                                        <AnimatePresence>
                                            {showInstructions && os === 'ios' && PWA_INSTRUCTIONS_IOS}
                                        </AnimatePresence>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Fallback for unhandled specific OS priority (like linux, macos Web fallback) */}
                        {(!isWindows && !isMobile) && (
                            <div className="space-y-3">
                                <button
                                    disabled
                                    className="w-full py-3 px-4 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                >
                                    <Apple size={18} />
                                    Baixar para Mac (.dmg) - Em Breve
                                </button>
                                <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Por enquanto, continue usando pelo navegador</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SECONDARY OPTIONS (Other OS variants) */}
            <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-3">Outras Plataformas</p>

                {!isWindows && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-background-tertiary text-text-secondary"><Monitor size={18} /></div>
                            <div>
                                <p className="text-sm font-bold text-text-primary">OitoH Desktop (Windows)</p>
                                <p className="text-[10px] text-text-secondary">Aplicativo nativo .exe</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-background-tertiary text-text-secondary">Acesse do PC</span>
                    </div>
                )}

                {!isMobile && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-background-tertiary text-text-secondary"><Smartphone size={18} /></div>
                            <div>
                                <p className="text-sm font-bold text-text-primary">OitoH Mobile (PWA)</p>
                                <p className="text-[10px] text-text-secondary">Instalação direta via navegador</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-background-tertiary text-text-secondary">Acesse do Celular</span>
                    </div>
                )}
            </div>
        </div>
    );
};
