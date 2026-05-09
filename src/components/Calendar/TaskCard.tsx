import React from 'react';
import { Task } from '../../store/useTaskStore';
import { useTaskStore } from '../../store/useTaskStore';
import { Play, CheckCircle2, Clock, FileText, XCircle, Calendar } from 'lucide-react';
import { format, isBefore, addMinutes } from 'date-fns';
import { motion } from 'framer-motion';
import { getPlatformInfo } from '../../hooks/usePlatform';

const { isTouchDevice } = getPlatformInfo();

interface TaskCardProps {
    task: Task;
    style: React.CSSProperties;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, style }) => {
    const {
        startTask,
        showCompleteConfirmation,
        setViewingTaskId,
        showCancelConfirmation,
        openRescheduleModal,
        resumeTask,
    } = useTaskStore();

    const now = new Date();
    const isOverdue = task.status === 'overdue';
    const isCompleted = task.status === 'completed';
    const isCancelled = task.status === 'cancelled';
    const isInProgress = task.status === 'in-progress';
    const isPaused = task.status === 'paused';

    // Logic for "Start Early" vs "Start"
    const isEarly = isBefore(now, new Date(task.startTime));

    const getStatusColor = () => {
        if (isCompleted) return 'bg-green-900/20 border-green-800/50 opacity-60';
        if (isCancelled) return 'bg-background-tertiary/50 border-border/30 opacity-40 grayscale';
        if (isInProgress) return 'bg-blue-900/40 border-accent/50 shadow-lg shadow-accent/20';
        if (isPaused) return 'bg-amber-900/20 border-amber-800/50 shadow-lg shadow-amber-900/20';
        if (isOverdue) return 'bg-red-900/20 border-red-800/50';
        return 'bg-background-secondary/80 border-border/50 hover:bg-background-tertiary';
    };

    const handleTaskClick = () => {
        if (isCompleted || isCancelled) {
            setViewingTaskId(task.id);
        }
    };

    // On touch devices, always show actions; on mouse, show on hover
    const actionVisibility = isTouchDevice
        ? 'opacity-100'
        : 'opacity-0 group-hover:opacity-100';

    const buttonSize = isTouchDevice ? 'p-2 min-w-[36px] min-h-[36px]' : 'p-1.5';

    return (
        <motion.div
            layoutId={task.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleTaskClick}
            title={`${task.title} (${format(new Date(task.startTime), 'HH:mm')} - ${task.durationMinutes}m)`}
            className={`absolute rounded-lg p-2 sm:p-3 border backdrop-blur-sm transition-all group overflow-visible hover:z-[100] hover:shadow-xl flex flex-col cursor-pointer ${getStatusColor()}`}
            style={{
                ...style,
                minHeight: '40px'
            }}
        >
            {/* Detailed Hover Tooltip - hidden on touch */}
            {!isTouchDevice && (
                <div className="absolute left-0 top-0 w-full h-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-[110]">
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-background-secondary border border-border rounded-lg p-2 shadow-2xl pointer-events-none">
                        <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mb-1">Detalhes</div>
                        <div className="text-xs font-bold text-text-primary mb-1">{task.title}</div>
                        <div className="text-[10px] text-text-secondary">
                            {format(new Date(task.startTime), 'HH:mm')} às {format(addMinutes(new Date(task.startTime), task.durationMinutes), 'HH:mm')}
                        </div>
                        {task.description && (
                            <div className="text-[9px] text-text-secondary mt-1 border-t border-border pt-1 italic">
                                {task.description}
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 sm:gap-2 mb-0.5">
                        <h3 className={`font-semibold text-xs sm:text-sm truncate ${isCompleted ? 'text-green-500 line-through' :
                            isCancelled ? 'text-text-secondary line-through decoration-text-secondary' :
                                isInProgress ? 'text-blue-400' :
                                    isPaused ? 'text-amber-400' :
                                        isOverdue ? 'text-red-400' :
                                            'text-text-primary'
                            }`}>
                            {task.title}
                            {isOverdue && task.overdueMinutes !== undefined && task.overdueMinutes > 0 && (
                                <span className="ml-1 sm:ml-2 text-[10px] px-1 bg-red-500/20 text-red-400 rounded animate-pulse">
                                    +{task.overdueMinutes}m
                                </span>
                            )}
                            {isPaused && (
                                <span className="ml-1 sm:ml-2 text-[10px] px-1 bg-amber-500/20 text-amber-400 rounded animate-pulse">
                                    PAUSADA
                                </span>
                            )}
                        </h3>
                        {task.description && <FileText size={12} className="text-text-secondary flex-shrink-0 hidden sm:block" />}
                    </div>
                    <div className="text-[10px] sm:text-xs text-text-secondary flex items-center gap-1">
                        <Clock size={10} />
                        {format(new Date(task.startTime), 'HH:mm')} - {task.durationMinutes}m
                    </div>
                </div>

                {!isCompleted && !isCancelled && (
                    <div className={`${actionVisibility} transition-opacity flex gap-0.5 sm:gap-1 bg-background-secondary/80 rounded-lg p-0.5 sm:p-1 backdrop-blur-md shadow-sm border border-border/50`}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setViewingTaskId(task.id); }}
                            className={`${buttonSize} hover:bg-background-tertiary rounded-md text-text-secondary hover:text-text-primary transition-colors`}
                            title="Detalhes"
                        >
                            <FileText size={14} />
                        </button>
                        {(task.status === 'pending' || task.status === 'paused') && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (task.status === 'paused') {
                                            resumeTask(task.id);
                                        } else if (isEarly) {
                                            useTaskStore.setState({ showAdvanceModal: true, advanceTaskId: task.id });
                                        } else {
                                            // CONFLICT CHECK
                                            const state = useTaskStore.getState();
                                            const activeTaskId = state.activeTaskId;
                                            if (activeTaskId && activeTaskId !== task.id) {
                                                state.openStartConflictModal(task.id);
                                            } else {
                                                startTask(task.id);
                                            }
                                        }
                                    }}
                                    className={`${buttonSize} hover:bg-blue-600 rounded-md text-blue-400 hover:text-white transition-colors`}
                                    title={task.status === 'paused' ? "Retomar" : isEarly ? "Começar Mais Cedo" : "Começar Tarefa"}
                                >
                                    <Play size={14} className={isEarly && task.status === 'pending' ? "opacity-70" : ""} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); openRescheduleModal(task.id); }}
                                    className={`${buttonSize} hover:bg-background-tertiary rounded-md text-text-secondary hover:text-text-primary transition-colors`}
                                    title="Reagendar"
                                >
                                    <Calendar size={14} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); showCancelConfirmation(task.id); }}
                                    className={`${buttonSize} hover:bg-background-tertiary rounded-md text-text-secondary hover:text-text-primary transition-colors`}
                                    title="Cancelar Tarefa"
                                >
                                    <XCircle size={14} />
                                </button>
                            </>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                showCompleteConfirmation(task.id);
                            }}
                            className={`${buttonSize} hover:bg-green-600 rounded-md text-green-400 hover:text-white transition-colors`}
                            title="Concluir"
                        >
                            <CheckCircle2 size={14} />
                        </button>
                    </div>
                )}
            </div>

            {task.description && (
                <div className="mt-2 text-xs text-text-secondary line-clamp-2 hidden sm:block">
                    {task.description}
                </div>
            )}

            {(isInProgress || isPaused) && (
                <div className={`absolute bottom-0 left-0 h-1 ${isPaused ? 'bg-amber-500 opacity-50' : 'bg-blue-500 animate-pulse'} w-full`} />
            )}

            {task.overflowToNextDayCandidate && (
                <div className="mt-1 px-1 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-[9px] text-yellow-500 flex items-center gap-1">
                    <Clock size={8} />
                    <span className="hidden sm:inline">Pode ultrapassar o limite do dia</span>
                    <span className="sm:hidden">Limite do dia</span>
                </div>
            )}
        </motion.div>
    );
};
