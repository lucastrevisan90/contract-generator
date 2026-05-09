import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface RecurrenceSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RecurrenceSuccessModal: React.FC<RecurrenceSuccessModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center"
                >
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
                        <CheckCircle2 size={32} />
                    </div>

                    <h2 className="text-xl font-bold text-white mb-2">Série Criada!</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        Tarefas agendadas para os próximos 180 dias.
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors"
                    >
                        OK
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
