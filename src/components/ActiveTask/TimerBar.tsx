import React, { useEffect, useState } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { differenceInSeconds } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Pause, PlayCircle, Clock, Info, Maximize2 } from 'lucide-react';
import { Task } from '../../store/useTaskStore';

const ActiveTaskItem: React.FC<{ task: Task }> = ({ task }) => {
    const {
        pauseTask,
        resumeTask,
        showCompleteConfirmation,
        extendTask,
        setViewingTaskId,
        setFocusMode
    } = useTaskStore();

    const [progress, setProgress] = useState(0);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const updateTimer = () => {
            const start = new Date(task.startTime);
            const durationSeconds = task.durationMinutes * 60;

            let referenceTime = new Date();
            if (task.status === 'paused' && task.pausedAt) {
                referenceTime = new Date(task.pausedAt);
            }

            const elapsedSeconds = differenceInSeconds(referenceTime, start);
            const currentProgress = Math.min(100, Math.max(0, (elapsedSeconds / durationSeconds) * 100));
            setProgress(currentProgress);

            const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        };

        updateTimer();
        if (task.status === 'paused') return;

        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [task]);

    const isPaused = task.status === 'paused';

    return (
        <div className={`bg-background-secondary/90 border border-border rounded-xl p-2.5 sm:p-3 shadow-lg backdrop-blur-md transition-all ${!isPaused ? 'ring-2 ring-blue-500/30' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex flex-col flex-1 min-w-0 group/info cursor-pointer" onClick={() => setViewingTaskId(task.id)}>
                    <div className="flex items-center gap-2">
                        <span className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded ${isPaused ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            {isPaused ? 'PAUSADA' : 'EXECUTANDO'}
                        </span>
                        <h3 className="font-bold text-xs sm:text-sm text-text-primary truncate group-hover/info:text-blue-400 transition-colors" title="Ver detalhes">
                            {task.title}
                        </h3>
                        <Info size={14} className="text-blue-400 group-hover/info:text-blue-300 transition-colors hidden sm:block" />
                    </div>
                    <div className="mt-2 relative h-1 bg-background-tertiary rounded-full overflow-hidden">
                        <motion.div
                            className={`absolute top-0 left-0 h-full bg-gradient-to-r ${isPaused ? 'from-slate-600 to-slate-500 opacity-50' : 'from-blue-600 to-indigo-600'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                    <div className={`text-base sm:text-lg font-mono font-bold w-14 sm:w-16 text-left sm:text-right ${isPaused ? 'text-text-secondary' : 'text-blue-400'}`}>
                        {timeLeft}
                    </div>

                    <div className="flex gap-1 sm:gap-1.5">
                        {isPaused ? (
                            <>
                                <button
                                    onClick={() => extendTask(task.id, 30)}
                                    className="p-2 bg-background-tertiary hover:bg-border text-text-secondary rounded-lg transition-colors"
                                    title="+30m"
                                >
                                    <Clock size={14} />
                                </button>
                                <button
                                    onClick={() => resumeTask(task.id)}
                                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                                    title="Retomar"
                                >
                                    <PlayCircle size={14} />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => pauseTask(task.id)}
                                className="p-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
                                title="Pausar"
                            >
                                <Pause size={14} />
                            </button>
                        )}
                        {!isPaused && (
                            <button
                                onClick={() => setFocusMode(true)}
                                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors hidden sm:block"
                                title="Focar"
                            >
                                <Maximize2 size={14} />
                            </button>
                        )}
                        <button
                            onClick={() => showCompleteConfirmation(task.id)}
                            className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                            title="Concluir"
                        >
                            <CheckSquare size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const TimerBar: React.FC = () => {
    const { tasks } = useTaskStore();
    const activeTasks = tasks.filter(t => t.status === 'in-progress' || t.status === 'paused');

    if (activeTasks.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-3 sm:px-4 z-50 pointer-events-none safe-bottom"
            >
                <div className="flex flex-col gap-2 pointer-events-auto">
                    {activeTasks.map(task => (
                        <ActiveTaskItem key={task.id} task={task} />
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
