import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, Repeat, CheckCircle2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (mode: 'single' | 'series' | 'subsequent') => void;
    taskTitle: string;
    isRecurring: boolean;
    canDeleteSeries: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    taskTitle,
    isRecurring,
    canDeleteSeries
}) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden"
                >
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Trash2 size={120} className="text-red-500" />
                    </div>

                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-500">
                            <Trash2 size={24} />
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2">Excluir Tarefa?</h3>
                        <p className="text-slate-400 text-sm mb-4">
                            Você tem certeza que deseja excluir permanentemente: <br />
                            <span className="text-white font-medium">"{taskTitle}"</span>?
                        </p>

                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 flex gap-3">
                            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-300 leading-relaxed">
                                Esta ação não pode ser desfeita. A tarefa será removida do sistema e não aparecerá mais nos relatórios.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            {/* Option 1: Delete Single Task */}
                            <button
                                onClick={() => onConfirm('single')}
                                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-xl font-medium transition-all flex items-center justify-between group"
                            >
                                <span className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-slate-500 group-hover:text-white" />
                                    Excluir apenas esta tarefa
                                </span>
                            </button>

                            {/* Option 2: Delete Subsequent */}
                            {isRecurring && (
                                <button
                                    onClick={() => onConfirm('subsequent')}
                                    className="w-full py-3 px-4 bg-orange-600/10 hover:bg-orange-600 hover:text-white border border-orange-600/30 hover:border-orange-600 text-orange-400 rounded-xl font-medium transition-all flex items-center justify-between group"
                                >
                                    <span className="flex items-center gap-2">
                                        <Repeat size={16} className="group-hover:text-white" />
                                        Excluir esta e subsequentes
                                    </span>
                                </button>
                            )}

                            {/* Option 3: Delete Entire Series (Conditional) */}
                            {isRecurring && canDeleteSeries && (
                                <button
                                    onClick={() => onConfirm('series')}
                                    className="w-full py-3 px-4 bg-red-600/10 hover:bg-red-600 hover:text-white border border-red-600/30 hover:border-red-600 text-red-400 rounded-xl font-medium transition-all flex items-center justify-between group"
                                >
                                    <span className="flex items-center gap-2">
                                        <Trash2 size={16} className="group-hover:text-white" />
                                        Excluir toda a série
                                    </span>
                                </button>
                            )}

                            <button
                                onClick={onClose}
                                className="mt-2 py-2 text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
