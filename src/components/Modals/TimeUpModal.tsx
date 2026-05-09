import { useTaskStore } from '../../store/useTaskStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CalendarClock, CheckCircle } from 'lucide-react';
import { playSound } from '../../utils/audio';
import { useEffect } from 'react';

interface TimeUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReschedule: () => void;
    taskTitle: string;
    taskId: string;
}

export const TimeUpModal: React.FC<TimeUpModalProps> = ({ isOpen, onClose, onReschedule, taskTitle, taskId }) => {
    const { extendTask, completeTask } = useTaskStore();

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
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400">
                            <Clock size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">O Tempo Acabou!</h2>
                        <p className="text-slate-400">
                            Seu tempo para <span className="text-white font-semibold">"{taskTitle}"</span> esgotou.
                            O que você gostaria de fazer?
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => { completeTask(taskId); onClose(); }}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-colors"
                        >
                            <CheckCircle size={20} />
                            Concluir
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => { extendTask(taskId, 30); onClose(); }}
                                className="flex flex-col items-center justify-center gap-1 py-3 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-xl font-medium transition-colors border border-slate-700"
                            >
                                <span>+30 min</span>
                                <span className="text-[10px] opacity-60">Estender</span>
                            </button>
                            <button
                                onClick={() => { extendTask(taskId, 60); onClose(); }}
                                className="flex flex-col items-center justify-center gap-1 py-3 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-xl font-medium transition-colors border border-slate-700"
                            >
                                <span>+1 hora</span>
                                <span className="text-[10px] opacity-60">Estender</span>
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                onReschedule();
                                onClose();
                            }}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-transparent hover:bg-slate-800/50 text-slate-400 rounded-xl font-medium transition-colors"
                        >
                            <CalendarClock size={18} />
                            Reagendar
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
