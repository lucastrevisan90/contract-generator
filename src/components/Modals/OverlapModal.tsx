import React from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Pause, CheckCircle2, XCircle, Calendar, Clock } from 'lucide-react';

interface OverlapModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId: string; // The pending task causing the overlap
}

export const OverlapModal: React.FC<OverlapModalProps> = ({ isOpen, onClose, taskId }) => {
    const {
        activeTaskId, // Use activeTaskId from store directly
        tasks,
        pauseTask,
        startTask,
        openRescheduleModal,
        showCompleteConfirmation,
        showCancelConfirmation,
        updateTask
    } = useTaskStore();

    if (!isOpen) return null;

    const activeTask = tasks.find(t => t.id === activeTaskId);
    const nextTask = tasks.find(t => t.id === taskId);

    if (!activeTask || !nextTask) return null;

    const handlePauseAndStart = async () => {
        await pauseTask(activeTask.id);
        await startTask(nextTask.id);
        onClose();
    };

    const handleRescheduleNext = () => {
        openRescheduleModal(nextTask.id);
        onClose();
    };

    const handleConcludeActive = () => {
        showCompleteConfirmation(activeTask.id);
        // Note: startTask(nextTask.id) will be handled by the user manually 
        // OR we could auto-start it after completion, but requirement says
        // "Concluir a atual e permitir que a próxima comece".
        // Let's stick to showing the confirmation first.
        onClose();
    };

    const handleCancelNext = () => {
        showCancelConfirmation(nextTask.id);
        onClose();
    };

    const handlePostponeNext = (minutes: number) => {
        const newStartTime = new Date(new Date(nextTask.startTime).getTime() + minutes * 60000);
        const newDuration = Math.max(1, nextTask.durationMinutes - minutes);
        updateTask(nextTask.id, {
            startTime: newStartTime,
            durationMinutes: newDuration
        });
        onClose();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-background-secondary border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                >
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4 text-amber-400">
                            <AlertCircle size={24} />
                            <h2 className="text-xl font-bold">Conflito de Horário</h2>
                        </div>

                        <p className="text-text-secondary mb-6">
                            A tarefa <span className="text-text-primary font-semibold">"{nextTask.title}"</span> deveria ter começado, mas <span className="text-text-primary font-semibold">"{activeTask.title}"</span> ainda está em andamento. O que deseja fazer?
                        </p>

                        <div className="grid gap-3">
                            <button
                                onClick={handlePauseAndStart}
                                className="flex items-center gap-3 p-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 rounded-xl text-blue-400 font-medium transition-all group text-left"
                            >
                                <div className="p-2 bg-blue-600 rounded-lg text-white group-hover:scale-110 transition-transform">
                                    <Pause size={18} />
                                </div>
                                <div>
                                    <div className="text-sm">Pausar atual e iniciar próxima</div>
                                    <div className="text-xs opacity-60 font-normal">Ideal para interrupções rápidas</div>
                                </div>
                            </button>

                            <button
                                onClick={handleRescheduleNext}
                                className="flex items-center gap-3 p-3 bg-background-tertiary hover:bg-border border border-border rounded-xl text-text-primary font-medium transition-all group text-left"
                            >
                                <div className="p-2 bg-border rounded-lg text-text-secondary group-hover:scale-110 transition-transform">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <div className="text-sm">Reagendar a próxima</div>
                                    <div className="text-xs text-text-secondary font-normal">Adiar "{nextTask.title}" para mais tarde</div>
                                </div>
                            </button>

                            <button
                                onClick={handleConcludeActive}
                                className="flex items-center gap-3 p-3 bg-green-600/10 hover:bg-green-600/20 border border-green-600/30 rounded-xl text-green-400 font-medium transition-all group text-left"
                            >
                                <div className="p-2 bg-green-600 rounded-lg text-white group-hover:scale-110 transition-transform">
                                    <CheckCircle2 size={18} />
                                </div>
                                <div>
                                    <div className="text-sm">Concluir a atual agora</div>
                                    <div className="text-xs opacity-60 font-normal">Terminar "{activeTask.title}" imediatamente</div>
                                </div>
                            </button>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handlePostponeNext(5)}
                                    className="flex items-center justify-center gap-2 py-2 bg-background-tertiary hover:bg-border border border-border rounded-xl text-text-secondary text-xs font-bold transition-all"
                                >
                                    <Clock size={14} />
                                    Adiar 5m
                                </button>
                                <button
                                    onClick={() => handlePostponeNext(10)}
                                    className="flex items-center justify-center gap-2 py-2 bg-background-tertiary hover:bg-border border border-border rounded-xl text-text-secondary text-xs font-bold transition-all"
                                >
                                    <Clock size={14} />
                                    Adiar 10m
                                </button>
                            </div>

                            <button
                                onClick={handleCancelNext}
                                className="flex items-center gap-3 p-3 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 rounded-xl text-red-400 font-medium transition-all group text-left"
                            >
                                <div className="p-2 bg-red-600 rounded-lg text-white group-hover:scale-110 transition-transform">
                                    <XCircle size={18} />
                                </div>
                                <div>
                                    <div className="text-sm">Cancelar a próxima</div>
                                    <div className="text-xs opacity-60 font-normal">Remover "{nextTask.title}" do cronômetro</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="p-4 bg-background-tertiary/50 border-t border-border flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium"
                        >
                            Decidir depois
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
