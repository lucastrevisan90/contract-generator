import React from 'react';
import { LayoutList, Calendar as CalendarIcon, CheckSquare, BarChart3, Shield, Settings, HelpCircle, LogOut, PlayCircle, BookOpen, Mail } from 'lucide-react';

interface DesktopSidebarProps {
    viewMode: string;
    setViewMode: (mode: any) => void;
    isAdmin: boolean;
    setIsSettingsOpen: (open: boolean) => void;
    setIsHelpMenuOpen: (open: boolean) => void;
    isHelpMenuOpen: boolean;
    signOut: () => void;
    setRunTutorial: (run: boolean) => void;
    setIsDocModalOpen: (open: boolean) => void;
    setIsSupportModalOpen: (open: boolean) => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
    viewMode,
    setViewMode,
    isAdmin,
    setIsSettingsOpen,
    setIsHelpMenuOpen,
    isHelpMenuOpen,
    signOut,
    setRunTutorial,
    setIsDocModalOpen,
    setIsSupportModalOpen
}) => {
    const navItems = [
        { id: 'nav-day', mode: 'day', icon: LayoutList, label: 'Hoje' },
        { id: 'nav-month', mode: 'month', icon: CalendarIcon, label: 'Mês' },
        { id: 'nav-habits', mode: 'habits', icon: CheckSquare, label: 'Hábitos' },
        { id: 'nav-stats', mode: 'stats', icon: BarChart3, label: 'Estatísticas' },
    ];

    return (
        <aside className="hidden md:flex flex-col w-64 bg-background-secondary/50 border-r border-border h-full p-4 transition-all">
            <div className="flex-1 space-y-2 mt-4" id="nav-views">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        id={item.id}
                        onClick={() => setViewMode(item.mode)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${viewMode === item.mode
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold'
                            : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary'
                            }`}
                    >
                        <item.icon size={20} />
                        {item.label}
                    </button>
                ))}

                {isAdmin && (
                    <button
                        onClick={() => setViewMode('admin')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${viewMode === 'admin'
                            ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20 font-bold'
                            : 'text-slate-400 hover:text-amber-500 hover:bg-background-tertiary'
                            }`}
                    >
                        <Shield size={20} />
                        Painel Admin
                    </button>
                )}
            </div>

            <div className="pt-4 border-t border-border/50 space-y-2 relative">
                <button
                    id="help-button-desktop"
                    onClick={() => setIsHelpMenuOpen(!isHelpMenuOpen)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isHelpMenuOpen
                        ? 'bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30'
                        : 'text-text-secondary hover:text-indigo-400 hover:bg-background-tertiary'
                        }`}
                >
                    <HelpCircle size={20} />
                    Centro de Ajuda
                </button>

                {isHelpMenuOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsHelpMenuOpen(false)} />
                        <div className="absolute left-full ml-4 bottom-0 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-left-2">
                            <div className="px-4 py-2 border-b border-slate-800/50 mb-1">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Centro de Ajuda</p>
                            </div>
                            <button
                                onClick={() => { setRunTutorial(true); setIsHelpMenuOpen(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-800 text-slate-300 hover:text-white text-sm flex items-center gap-3 transition-colors"
                            >
                                <PlayCircle size={18} className="text-indigo-400" />
                                Ver Tutorial (Tour)
                            </button>
                            <button
                                onClick={() => { setIsDocModalOpen(true); setIsHelpMenuOpen(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-800 text-slate-300 hover:text-white text-sm flex items-center gap-3 transition-colors"
                            >
                                <BookOpen size={18} className="text-emerald-400" />
                                Documentação & FAQ
                            </button>
                            <button
                                onClick={() => { setIsSupportModalOpen(true); setIsHelpMenuOpen(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-800 text-slate-300 hover:text-white text-sm flex items-center gap-3 transition-colors"
                            >
                                <Mail size={18} className="text-blue-400" />
                                Suporte Técnico
                            </button>
                        </div>
                    </>
                )}

                <button
                    id="settings-button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-text-secondary hover:text-text-primary hover:bg-background-tertiary"
                >
                    <Settings size={20} />
                    Configurações
                </button>

                <button
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-500 hover:bg-red-500/10"
                >
                    <LogOut size={20} />
                    Sair
                </button>
            </div>
        </aside>
    );
};
