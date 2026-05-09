import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, Calendar, XCircle, AlertCircle } from 'lucide-react';
import { playSound } from '../../utils/audio';
import { differenceInSeconds } from 'date-fns';

interface StartTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskTitle: string;
    taskId: string;
}

export const StartTaskModal: React.FC<StartTaskModalProps> = ({ isOpen, onClose, taskTitle, taskId }) => {
    const {
        tasks,
        startTask,
        updateTask,
        showCancelConfirmation,
        openRescheduleModal
    } = useTaskStore();

    const task = tasks.find(t => t.id === taskId);
    const [atraso, setAtraso] = useState('00:00');

    useEffect(() => {
        if (isOpen) playSound('popup');
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !task) return;

        const updateTimer = () => {
            const now = new Date();
            const start = new Date(task.startTime);
            const diffSeconds = Math.max(0, differenceInSeconds(now, start));
            const minutes = Math.floor(diffSeconds / 60);
            const seconds = diffSeconds % 60;
            setAtraso(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [isOpen, task]);

    if (!isOpen || !task) return null;

    const runningTask = tasks.find(t => t.id !== taskId && (t.status === 'in-progress' || t.status === 'paused'));

    const handleStart = (pauseOthers: boolean) => {
        startTask(taskId, { pauseOthers });
        onClose();
    };

    const handlePostpone = (minutes: number) => {
        const newStartTime = new Date(new Date(task.startTime).getTime() + minutes * 60000);
        const newDuration = Math.max(1, task.durationMinutes - minutes);

        updateTask(taskId, {
            startTime: newStartTime,
            durationMinutes: newDuration
        });
        onClose();
    };

    const handleReschedule = () => {
        openRescheduleModal(taskId);
        onClose();
    };

    const handleCancel = () => {
        showCancelConfirmation(taskId);
        onClose();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[70] flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    className="bg-background-secondary border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                >
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3 text-blue-400">
                                <div className="p-3 bg-blue-500/20 rounded-2xl">
                                    <Play size={24} fill="currentColor" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-text-primary">Hora de Começar!</h2>
                                    <div className="flex items-center gap-1.5 text-xs text-amber-500 font-mono font-bold mt-1">
                                        <AlertCircle size={12} />
                                        ATRASO: {atraso}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                            A tarefa <span className="text-text-primary font-bold">"{taskTitle}"</span> está pronta no cronograma. O tempo já está sendo contabilizado.
                        </p>

                        {runningTask ? (
                            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                <p className="text-xs text-amber-500 font-bold mb-2 flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    {runningTask.status === 'paused' ? 'TAREFA PAUSADA:' : 'TAREFA EM ANDAMENTO:'}
                                </p>
                                <p className="text-sm text-text-primary font-medium mb-3">"{runningTask.title}"</p>

                                <div className="grid gap-2">
                                    {/* Option 1: Pause Current, Start New */}
                                    <button
                                        onClick={() => handleStart(true)}
                                        className="flex items-center justify-between px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-lg text-left group"
                                    >
                                        <div>
                                            <span className="block text-xs font-bold uppercase opacity-80 mb-0.5">Recomendado</span>
                                            <span className="text-sm font-bold">
                                                {runningTask.status === 'paused' ? 'Manter Pausada & Iniciar Nova' : 'Pausar Atual & Iniciar Nova'}
                                            </span>
                                        </div>
                                        <Play size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>

                                    {/* Option 2: Concurrent (Only if allowed) */}
                                    {runningTask.allowOverlap ? (
                                        <button
                                            onClick={() => handleStart(false)}
                                            className="flex items-center justify-center gap-2 py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg font-bold text-sm transition-all"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="flex -space-x-1">
                                                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-75" />
                                                </div>
                                                Manter Ambas em Andamento
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 py-3 bg-slate-800/50 text-slate-500 border border-slate-700 rounded-lg text-xs font-medium cursor-not-allowed opacity-70" title="A tarefa atual não permite sobreposição">
                                            <XCircle size={14} />
                                            Sobreposição Bloqueada pela Tarefa Atual
                                        </div>
                                    )}

                                    {/* Option 3: Reschedule CURRENT task */}
                                    <button
                                        onClick={() => {
                                            openRescheduleModal(runningTask.id);
                                            onClose();
                                        }}
                                        className="flex items-center justify-center gap-2 py-2 bg-transparent hover:bg-white/5 text-slate-400 hover:text-white rounded-lg text-xs font-medium transition-colors mt-1"
                                    >
                                        <Calendar size={14} />
                                        Reagendar a Tarefa Atual
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => handleStart(true)}
                                className="flex items-center justify-center gap-3 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 mb-3"
                            >
                                <Play size={20} fill="currentColor" />
                                Iniciar Tarefa
                            </button>
                        )}

                        <div className="grid gap-3">

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handlePostpone(5)}
                                    className="flex flex-col items-center justify-center p-3 bg-background-tertiary hover:bg-border rounded-xl text-text-secondary hover:text-text-primary transition-all border border-border/50"
                                >
                                    <Clock size={18} className="mb-1" />
                                    <span className="text-xs font-bold">Adiar 5m</span>
                                    <span className="text-[10px] opacity-60">Mantém fim</span>
                                </button>
                                <button
                                    onClick={() => handlePostpone(10)}
                                    className="flex flex-col items-center justify-center p-3 bg-background-tertiary hover:bg-border rounded-xl text-text-secondary hover:text-text-primary transition-all border border-border/50"
                                >
                                    <Clock size={18} className="mb-1" />
                                    <span className="text-xs font-bold">Adiar 10m</span>
                                    <span className="text-[10px] opacity-60">Mantém fim</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleReschedule}
                                    className="flex items-center justify-center gap-2 py-3 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 rounded-xl text-xs font-bold transition-all border border-slate-500/20"
                                >
                                    <Calendar size={16} />
                                    Reagendar
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-all border border-red-500/20"
                                >
                                    <XCircle size={16} />
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 bg-background-tertiary/50 border-t border-border flex justify-between items-center px-6">
                        <span className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Time Blocking V6</span>
                        <button
                            onClick={onClose}
                            className="text-xs text-text-secondary hover:text-text-primary font-medium"
                        >
                            Ignorar Notificação
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
