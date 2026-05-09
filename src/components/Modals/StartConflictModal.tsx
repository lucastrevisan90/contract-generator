import React, { useEffect } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Calendar, XCircle, AlertCircle, PauseCircle } from 'lucide-react';
import { playSound } from '../../utils/audio';

export const StartConflictModal: React.FC = () => {
    const {
        tasks,
        activeTaskId,
        showStartConflictModal,
        startConflictTaskId,
        startConflictIsAdvance,
        closeStartConflictModal,
        startTask,
        advanceTask,
        updateTask,
        openRescheduleModal
    } = useTaskStore();

    useEffect(() => {
        if (showStartConflictModal) playSound('popup');
    }, [showStartConflictModal]);

    if (!showStartConflictModal || !startConflictTaskId || !activeTaskId) return null;

    const taskToStart = tasks.find(t => t.id === startConflictTaskId);
    const activeTask = tasks.find(t => t.id === activeTaskId);

    if (!taskToStart || !activeTask) {
        // Fallback safety
        closeStartConflictModal();
        return null;
    }

    const handleStartWithPause = async () => {
        if (startConflictIsAdvance) {
            await advanceTask(startConflictTaskId);
        } else {
            await startTask(startConflictTaskId, { pauseOthers: true });
        }
        closeStartConflictModal();
    };

    const handleStartConcurrent = async () => {
        if (startConflictIsAdvance) {
            // "Advance" implies starting NOW. "Concurrent" implies keeping the other running.
            // advanceTask implementation currently pauses active task if currentActive != id.
            // We might need to modify advanceTask to accept options OR assume advanceTask always pauses?
            // User requirement: "Advance" should follow "Pause vs Concurrent" rules.
            // But `advanceTask` function in store might force pause?
            // Let's check `advanceTask` implementation in store.
            // It does: if (currentActiveId && currentActiveId !== id) await get().pauseTask(currentActiveId);
            // So `advanceTask` FORCES pause.
            // We need to update `advanceTask` to support options or use `updateTask` directly here for concurrent advance.

            // Workaround: Call updateTask directly for concurrent advance to bypass forced pause in advanceTask
            const now = new Date();
            await updateTask(startConflictTaskId, { startTime: now, status: 'in-progress' });
            useTaskStore.setState({ activeTaskId: startConflictTaskId });
            // Note: This sets activeTaskId to the new one. The old one remains 'in-progress'.
        } else {
            await startTask(startConflictTaskId, { pauseOthers: false });
        }
        closeStartConflictModal();
    };

    const handleRescheduleActive = () => {
        openRescheduleModal(activeTaskId);
        closeStartConflictModal();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                >
                    <div className="p-6">
                        <div className="flex items-center gap-3 text-amber-500 mb-6">
                            <div className="p-3 bg-amber-500/20 rounded-2xl">
                                <AlertCircle size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-white">Conflito de Execução</h2>
                        </div>

                        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                            A tarefa <strong className="text-white">"{activeTask.title}"</strong> já está em andamento. O que deseja fazer com a nova tarefa <strong className="text-blue-400">"{taskToStart.title}"</strong>?
                        </p>

                        <div className="space-y-3">
                            {/* Option 1: Pause Active & Start New (Primary) */}
                            <button
                                onClick={handleStartWithPause}
                                className="w-full flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg group text-left"
                            >
                                <div>
                                    <span className="block text-[10px] font-bold uppercase opacity-80 mb-1">Recomendado</span>
                                    <span className="text-sm font-bold">Pausar Atual & Iniciar Nova</span>
                                </div>
                                <div className="flex gap-1">
                                    <PauseCircle size={18} className="opacity-60" />
                                    <Play size={18} />
                                </div>
                            </button>

                            {/* Option 2: Concurrent (If allowed) */}
                            {activeTask.allowOverlap ? (
                                <button
                                    onClick={handleStartConcurrent}
                                    className="w-full flex items-center justify-center gap-2 p-4 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 rounded-xl font-bold text-sm transition-all"
                                >
                                    <div className="flex -space-x-2 mr-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-75" />
                                    </div>
                                    Executar Simultaneamente
                                </button>
                            ) : (
                                <div className="w-full flex items-center justify-center gap-2 p-3 bg-slate-800/50 text-slate-500 border border-slate-700/50 rounded-xl text-xs font-medium cursor-not-allowed opacity-70">
                                    <span className="flex items-center gap-1.5">
                                        <XCircle size={14} />
                                        Sobreposição não permitida pela tarefa atual
                                    </span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 mt-2">
                                {/* Option 3: Reschedule Active */}
                                <button
                                    onClick={handleRescheduleActive}
                                    className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
                                >
                                    <Calendar size={16} />
                                    Reagendar Atual
                                </button>

                                {/* Option 4: Cancel */}
                                <button
                                    onClick={closeStartConflictModal}
                                    className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
                                >
                                    <XCircle size={16} />
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
