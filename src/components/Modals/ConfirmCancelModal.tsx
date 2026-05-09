import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { playSound } from '../../utils/audio';
import { useEffect } from 'react';

interface ConfirmCancelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (cancelSubsequent?: boolean) => void;
    taskTitle: string;
    isRecurring?: boolean;
}

export const ConfirmCancelModal: React.FC<ConfirmCancelModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    taskTitle,
    isRecurring
}) => {
    const [cancelSubsequent, setCancelSubsequent] = React.useState(false);

    useEffect(() => {
        if (isOpen) {
            playSound('popup');
            setCancelSubsequent(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                >
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                            <AlertTriangle size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Cancelar tarefa?</h2>
                        <p className="text-slate-400 text-sm">
                            Tem certeza que deseja cancelar a tarefa <span className="text-white font-semibold">"{taskTitle}"</span>?
                        </p>
                    </div>

                    {isRecurring && (
                        <div className="mb-6 p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={cancelSubsequent}
                                    onChange={(e) => setCancelSubsequent(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-red-500 focus:ring-offset-0 focus:ring-red-500"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Cancelar subsequentes?</span>
                                    <span className="text-[10px] text-slate-500">Remove todas as ocorrências futuras desta série</span>
                                </div>
                            </label>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => { onConfirm(cancelSubsequent); onClose(); }}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition-colors"
                        >
                            Sim, Cancelar
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
                        >
                            Manter Tarefa
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
