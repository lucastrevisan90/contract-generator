import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Timer, Settings, Play, Pause, Square, X, Minus, 
    RefreshCcw, Bell, Clock 
} from 'lucide-react';
import { usePomodoroStore, PomodoroPhase } from '../../store/usePomodoroStore';

export const PomodoroTimer: React.FC = () => {
    const { 
        phase, timeLeft, isRunning, currentSession, currentCycle, settings,
        start, pause, stop, reset, tick, updateSettings 
    } = usePomodoroStore();

    const [isExpanded, setIsExpanded] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    
    // Timer Effect
    useEffect(() => {
        let interval: any;
        if (isRunning) {
            interval = setInterval(() => {
                tick();
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, tick]);

    // Format time (MM:SS)
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getPhaseLabel = (p: PomodoroPhase) => {
        switch(p) {
            case 'focus': return 'Foco';
            case 'short_break': return 'Pausa Curta';
            case 'long_break': return 'Pausa Longa';
            default: return 'Pomodoro';
        }
    };

    const getPhaseColor = (p: PomodoroPhase) => {
        switch(p) {
            case 'focus': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'short_break': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'long_break': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            default: return 'text-accent bg-accent/10 border-accent/20';
        }
    };

    // Close logic
    const handleClose = () => {
        if (isRunning || phase !== 'idle') {
            setShowCloseConfirm(true);
        } else {
            // If completely idle, we just minimize or stay hidden
            // But user said "fechar deve aparecer informação dizendo que vai encerrar"
            setShowCloseConfirm(true);
        }
    };

    const confirmClose = () => {
        stop();
        reset();
        setIsExpanded(false);
        setShowCloseConfirm(false);
    };

    return (
        <div className="fixed bottom-56 right-6 z-[60] flex flex-col items-end pointer-events-none">
            <AnimatePresence>
                {!isExpanded ? (
                    /* Minimal Floating Icon */
                    <motion.button
                        layoutId="pomodoro-container"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsExpanded(true)}
                        className={`pointer-events-auto p-4 rounded-full shadow-[0_0_30px_rgba(99,102,241,0.3)] border-2 flex items-center justify-center group relative transition-all active:scale-95 ${
                            isRunning ? 'bg-accent text-white border-white/40 animate-pulse' : 'bg-background-secondary text-text-primary border-accent/20 hover:border-accent'
                        }`}
                        title="Pomodoro Timer"
                    >
                        <Timer size={28} />
                        {isRunning && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-[11px] font-bold px-2 py-0.5 rounded-full border border-white">
                                {formatTime(timeLeft)}
                            </span>
                        )}
                    </motion.button>
                ) : (
                    /* Expanded Window */
                    <motion.div
                        layoutId="pomodoro-container"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="pointer-events-auto w-72 bg-background-secondary border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-3 bg-background-tertiary border-b border-border flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Timer size={18} className="text-accent" />
                                <span className="text-sm font-bold text-text-primary">Pomodoro</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => setIsExpanded(false)} 
                                    className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors"
                                    title="Minimizar"
                                >
                                    <Minus size={16} />
                                </button>
                                <button 
                                    onClick={handleClose} 
                                    className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors"
                                    title="Fechar e Encerrar"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Main Body */}
                        <div className="p-5 flex flex-col items-center gap-4">
                            {!showConfig ? (
                                <>
                                    {/* Phase Indicator */}
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getPhaseColor(phase)}`}>
                                        {getPhaseLabel(phase)}
                                    </div>

                                    {/* Time Display */}
                                    <div className="text-6xl font-black text-text-primary tracking-tighter tabular-nums drop-shadow-sm">
                                        {formatTime(timeLeft)}
                                    </div>

                                    {/* Sub-info */}
                                    <div className="flex items-center gap-4 text-xs text-text-secondary font-medium">
                                        <div className="flex items-center gap-1">
                                            <RefreshCcw size={12} />
                                            Sessão: {currentSession}/{settings.sessionsBeforeLongBreak}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <RefreshCcw size={12} className="rotate-90" />
                                            Ciclo: {currentCycle}/{settings.totalCycles}
                                        </div>
                                    </div>

                                    {/* Controls */}
                                    <div className="flex items-center gap-3 mt-2">
                                        {isRunning ? (
                                            <button 
                                                onClick={pause}
                                                className="w-12 h-12 flex items-center justify-center bg-background-tertiary text-text-primary rounded-xl border border-border hover:bg-white/5 transition-all"
                                                title="Pausar"
                                            >
                                                <Pause size={20} fill="currentColor" />
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={start}
                                                className="w-12 h-12 flex items-center justify-center bg-accent text-white rounded-xl shadow-lg shadow-accent/20 hover:bg-accent-hover transition-all active:scale-95"
                                                title="Iniciar"
                                            >
                                                <Play size={20} fill="currentColor" className="ml-1" />
                                            </button>
                                        )}
                                        
                                        <button 
                                            onClick={stop}
                                            className="w-12 h-12 flex items-center justify-center bg-background-tertiary text-text-primary rounded-xl border border-border hover:bg-white/5 transition-all"
                                            title="Parar"
                                        >
                                            <Square size={18} fill="currentColor" />
                                        </button>

                                        <button 
                                            onClick={() => setShowConfig(true)}
                                            className="w-12 h-12 flex items-center justify-center bg-background-tertiary text-text-primary rounded-xl border border-border hover:bg-white/5 transition-all"
                                            title="Configurar"
                                        >
                                            <Settings size={18} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                /* Config View */
                                <div className="w-full space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-text-secondary uppercase">Configuração</h3>
                                        <button onClick={() => setShowConfig(false)} className="text-accent text-xs font-bold hover:underline">Salvar</button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs text-text-secondary" htmlFor="pomodoro-focus">Foco (min)</label>
                                            <input 
                                                id="pomodoro-focus"
                                                type="number" 
                                                value={settings.focusTime}
                                                onChange={(e) => updateSettings({ focusTime: parseInt(e.target.value) || 1 })}
                                                className="w-full bg-background-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                                                aria-label="Tempo de Foco em minutos"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs text-text-secondary" htmlFor="pomodoro-sessions">Sessões</label>
                                            <input 
                                                id="pomodoro-sessions"
                                                type="number" 
                                                value={settings.sessionsBeforeLongBreak}
                                                onChange={(e) => updateSettings({ sessionsBeforeLongBreak: parseInt(e.target.value) || 1 })}
                                                className="w-full bg-background-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                                                aria-label="Quantidade de sessões antes da pausa longa"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs text-text-secondary" htmlFor="pomodoro-short">Pausa Curta</label>
                                            <input 
                                                id="pomodoro-short"
                                                type="number" 
                                                value={settings.shortBreakTime}
                                                onChange={(e) => updateSettings({ shortBreakTime: parseInt(e.target.value) || 1 })}
                                                className="w-full bg-background-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                                                aria-label="Tempo de pausa curta em minutos"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs text-text-secondary" htmlFor="pomodoro-long">Pausa Longa</label>
                                            <input 
                                                id="pomodoro-long"
                                                type="number" 
                                                value={settings.longBreakTime}
                                                onChange={(e) => updateSettings({ longBreakTime: parseInt(e.target.value) || 1 })}
                                                className="w-full bg-background-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                                                aria-label="Tempo de pausa longa em minutos"
                                            />
                                        </div>
                                        <div className="space-y-1.5 col-span-2">
                                            <label className="text-xs text-text-secondary" htmlFor="pomodoro-cycles">Ciclos Totais</label>
                                            <input 
                                                id="pomodoro-cycles"
                                                type="number" 
                                                value={settings.totalCycles}
                                                onChange={(e) => updateSettings({ totalCycles: parseInt(e.target.value) || 1 })}
                                                className="w-full bg-background-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                                                aria-label="Quantidade total de ciclos"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer / Status Bar */}
                        <div className="px-4 py-2 bg-background-tertiary border-t border-border flex justify-between items-center text-[9px] text-text-secondary uppercase tracking-widest font-black">
                            <span>OitoH Pomodoro</span>
                            <div className="flex gap-1">
                                <Clock size={10} />
                                <Bell size={10} />
                            </div>
                        </div>

                        {/* Confirmation Overlay */}
                        <AnimatePresence>
                            {showCloseConfirm && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-background-secondary/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center"
                                >
                                    <X className="text-red-400 mb-2" size={32} />
                                    <h3 className="text-sm font-bold text-text-primary mb-1">Encerrar Pomodoro?</h3>
                                    <p className="text-xs text-text-secondary mb-4">Isso interromperá o cronômetro e resetará seu progresso atual.</p>
                                    <div className="flex gap-2 w-full">
                                        <button 
                                            onClick={() => setShowCloseConfirm(false)}
                                            className="flex-1 py-2 bg-background-tertiary border border-border rounded-lg text-xs font-bold hover:bg-white/5"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            onClick={confirmClose}
                                            className="flex-1 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 shadow-lg shadow-red-500/20"
                                        >
                                            Encerrar
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
