import React from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Calendar, XCircle, CheckCircle2 } from 'lucide-react';

interface OverdueResolutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId: string;
}

export const OverdueResolutionModal: React.FC<OverdueResolutionModalProps> = ({ isOpen, onClose, taskId }) => {
    const { tasks, updateTask, showCancelConfirmation, openRescheduleModal } = useTaskStore();
    const task = tasks.find(t => t.id === taskId);
    const [isProcessing, setIsProcessing] = React.useState(false);

    if (!isOpen || !task) return null;

    const handleConcludeWithDelay = async () => {
        setIsProcessing(true);
        const now = new Date();
        await updateTask(task.id, {
            status: 'completed',
            completedAt: now,
            actualEndAt: now.toISOString(),
            completedWithDelay: true
        });
        setIsProcessing(false);
        onClose();
    };

    const handleReschedule = () => {
        openRescheduleModal(task.id);
        // NOTE: We do NOT call onClose() here.
        // We want this modal to stay "technically" open (blocked in queue)
        // so that the queue doesn't advance to the next task yet.
        // The ModalQueueManager will visually hide this modal while Reschedule is open.
    };

    const handleCancel = () => {
        showCancelConfirmation(task.id);
        // NOTE: Keeping queue blocked until confirmation is resolved
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-background-secondary border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                >
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4 text-red-400">
                            <AlertCircle size={24} />
                            <h2 className="text-xl font-bold">Tempo Esgotado</h2>
                        </div>

                        <p className="text-text-secondary mb-6">
                            A tarefa <span className="text-text-primary font-semibold">"{task.title}"</span> ultrapassou o horário planejado sem ser concluída. Como deseja proceder?
                        </p>

                        <div className="grid gap-3">
                            <button
                                onClick={handleConcludeWithDelay}
                                disabled={isProcessing}
                                className="flex items-center gap-3 p-3 bg-green-600/10 hover:bg-green-600/20 border border-green-600/30 rounded-xl text-green-400 font-medium transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="p-2 bg-green-600 rounded-lg text-white group-hover:scale-110 transition-transform">
                                    <CheckCircle2 size={18} />
                                </div>
                                <div>
                                    <div className="text-sm">{isProcessing ? 'Concluindo...' : 'Concluir com atraso'}</div>
                                    <div className="text-xs opacity-60 font-normal">Finaliza a tarefa agora mesmo</div>
                                </div>
                            </button>

                            <button
                                onClick={handleReschedule}
                                disabled={isProcessing}
                                className="flex items-center gap-3 p-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 rounded-xl text-blue-400 font-medium transition-all group text-left"
                            >
                                <div className="p-2 bg-blue-600 rounded-lg text-white group-hover:scale-110 transition-transform">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <div className="text-sm">Reagendar para o futuro</div>
                                    <div className="text-xs opacity-60 font-normal">Escolher um novo horário</div>
                                </div>
                            </button>

                            <button
                                onClick={handleCancel}
                                disabled={isProcessing}
                                className="flex items-center gap-3 p-3 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 rounded-xl text-red-400 font-medium transition-all group text-left"
                            >
                                <div className="p-2 bg-red-600 rounded-lg text-white group-hover:scale-110 transition-transform">
                                    <XCircle size={18} />
                                </div>
                                <div>
                                    <div className="text-sm">Cancelar tarefa</div>
                                    <div className="text-xs opacity-60 font-normal">Remover do cronograma</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="p-4 bg-background-tertiary/50 border-t border-border flex justify-between items-center">
                        <span className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">V6 Autogestão</span>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium"
                        >
                            Ignorar por enquanto
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
