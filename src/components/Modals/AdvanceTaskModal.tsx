import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskStore } from '../../store/useTaskStore';
import { Clock, AlertCircle } from 'lucide-react';
import { playSound } from '../../utils/audio';
import { useEffect } from 'react';
import { format } from 'date-fns';

interface AdvanceTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    taskTitle: string;
    scheduledTime: Date;
}

export const AdvanceTaskModal: React.FC<AdvanceTaskModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    taskTitle,
    scheduledTime
}) => {
    const { activeTaskId, advanceTaskId, openStartConflictModal } = useTaskStore();

    useEffect(() => {
        if (isOpen) playSound('popup');
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                >
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-400">
                            <AlertCircle size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Deseja adiantar tarefa?</h2>
                        <p className="text-slate-400 text-sm">
                            A tarefa <span className="text-white font-semibold">"{taskTitle}"</span> está agendada para{' '}
                            <span className="text-blue-400 font-medium">
                                {format(scheduledTime, "dd/MM/yyyy 'às' HH:mm")}
                            </span>
                        </p>
                        <p className="text-slate-500 text-xs mt-2">
                            Ao adiantar, a tarefa iniciará agora mantendo sua duração original.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                if (activeTaskId && advanceTaskId) {
                                    openStartConflictModal(advanceTaskId, true);
                                } else {
                                    onConfirm();
                                }
                                onClose();
                            }}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-blue-900/20"
                        >
                            <Clock size={20} />
                            Adiantar
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
