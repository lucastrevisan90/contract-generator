import React, { useEffect, useState } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { differenceInSeconds } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimize2, Clock } from 'lucide-react';

export const FocusStatusBar: React.FC = () => {
    const { tasks, activeTaskId, setFocusMode, isFocusMode } = useTaskStore();
    const activeTask = tasks.find(t => t.id === activeTaskId);

    // The bar remains visible ONLY if isFocusMode is true AND there's an active task
    const isVisible = isFocusMode && activeTask && (activeTask.status === 'in-progress' || activeTask.status === 'paused');

    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!activeTask) return;

        const updateTimer = () => {
            const start = new Date(activeTask.startTime);
            const durationSeconds = activeTask.durationMinutes * 60;

            let referenceTime = new Date();
            if (activeTask.status === 'paused' && activeTask.pausedAt) {
                referenceTime = new Date(activeTask.pausedAt);
            }

            const elapsedSeconds = differenceInSeconds(referenceTime, start);
            const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        };

        updateTimer();
        if (activeTask.status === 'paused') return;

        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activeTask]);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -100, x: '-50%', opacity: 0 }}
                animate={{ y: 0, x: '-50%', opacity: 1 }}
                exit={{ y: -100, x: '-50%', opacity: 0 }}
                className="fixed top-4 left-1/2 z-[9999] w-full max-w-md px-4"
            >
                <div className="bg-background-secondary/90 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-6 pointer-events-auto ring-1 ring-white/10">
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Focando em</span>
                        <h2 className="text-sm font-bold text-text-primary truncate">{activeTask.title}</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-tighter flex items-center gap-1">
                                <Clock size={10} /> Restante
                            </span>
                            <span className="text-xl font-mono font-black text-blue-400">
                                {timeLeft}
                            </span>
                        </div>

                        <button
                            onClick={() => setFocusMode(false)}
                            className="p-2.5 bg-background-tertiary hover:bg-border text-text-secondary hover:text-text-primary rounded-xl transition-all border border-border group"
                            title="Sair do Foco"
                        >
                            <Minimize2 size={18} className="group-hover:scale-90 transition-transform" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
