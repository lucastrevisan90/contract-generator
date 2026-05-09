import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import { playSound } from '../../utils/audio';
import { useEffect } from 'react';

interface ConfirmCompleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    taskTitle: string;
}

export const ConfirmCompleteModal: React.FC<ConfirmCompleteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    taskTitle
}) => {
    useEffect(() => {
        if (isOpen) {
            playSound('popup');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                >
                    <div className="flex justify-end mb-2">
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
                            <CheckCircle2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Concluir tarefa?</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Você tem certeza que deseja concluir a tarefa <span className="text-white font-semibold">"{taskTitle}"</span> agora?
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-green-900/20"
                        >
                            Confirmar conclusão
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
