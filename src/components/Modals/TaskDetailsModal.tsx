import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Calendar, AlertTriangle, CheckCircle2, XCircle, Play, Trash2 } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { useTaskStore } from '../../store/useTaskStore';
import { playSound } from '../../utils/audio';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface TaskDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    taskId: string;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ isOpen, onClose, onEdit, taskId }) => {
    const { tasks, deleteTask } = useTaskStore();
    const task = tasks.find(t => t.id === taskId);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    React.useEffect(() => {
        if (isOpen) playSound('popup');
    }, [isOpen]);

    const isRecurring = !!(task?.recurrence?.seriesId || task?.occurrence?.seriesId);
    const seriesId = task?.recurrence?.seriesId || task?.occurrence?.seriesId;

    // Check if entire series is cancelled
    const canDeleteSeries = React.useMemo(() => {
        if (!isRecurring || !seriesId) return false;
        const seriesTasks = tasks.filter(t => (t.recurrence?.seriesId === seriesId || t.occurrence?.seriesId === seriesId));
        // If ANY task in the series is NOT cancelled, we cannot delete the whole series
        return seriesTasks.every(t => t.status === 'cancelled');
    }, [tasks, isRecurring, seriesId]);

    if (!task) return null;

    const endTime = addMinutes(task.startTime, task.durationMinutes);

    const handleDeleteConfirm = async (mode: 'single' | 'series' | 'subsequent') => {
        await deleteTask(task.id, { 
            deleteSeries: mode === 'series', 
            deleteSubsequent: mode === 'subsequent' 
        });
        setShowDeleteModal(false);
        onClose(); // Close details modal after deletion
    };

    const getStatusColor = () => {
        switch (task.status) {
            case 'completed': return 'text-green-400';
            case 'cancelled': return 'text-red-400';
            case 'in-progress': return 'text-blue-400';
            case 'overdue': return 'text-orange-400';
            default: return 'text-slate-400';
        }
    };

    const getStatusText = () => {
        switch (task.status) {
            case 'completed': return 'Concluído';
            case 'cancelled': return 'Cancelado';
            case 'in-progress': return 'Em Andamento';
            case 'overdue': return 'Atrasado';
            default: return 'Pendente';
        }
    };

    const getStatusIcon = () => {
        switch (task.status) {
            case 'completed': return <CheckCircle2 size={20} />;
            case 'cancelled': return <XCircle size={20} />;
            case 'in-progress': return <Play size={20} />;
            case 'overdue': return <AlertTriangle size={20} />;
            default: return <Clock size={20} />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-10"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-800 flex justify-between items-start">
                            <div>
                                <div className={`flex items-center gap-2 text-sm font-medium mb-2 ${getStatusColor()}`}>
                                    {getStatusIcon()}
                                    <span className="uppercase tracking-wider">{getStatusText()}</span>
                                </div>
                                <h2 className="text-2xl font-bold text-white leading-tight">{task.title}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Delete Button - Only for Cancelled Tasks */}
                                {task.status === 'cancelled' && (
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-lg text-xs font-semibold text-red-500 transition-all border border-red-500/20 flex items-center gap-1.5"
                                        title="Excluir Tarefa"
                                    >
                                        <Trash2 size={14} />
                                        Excluir
                                    </button>
                                )}

                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-blue-400 hover:text-white transition-all border border-slate-700/50"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                                    title="Fechar"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Time Info */}
                            <div className="flex gap-6 text-slate-300">
                                <div className="flex items-center gap-2">
                                    <Calendar size={18} className="text-slate-500" />
                                    <span>{format(task.startTime, 'MMM d, yyyy')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={18} className="text-slate-500" />
                                    <span>{format(task.startTime, 'HH:mm')} - {format(endTime, 'HH:mm')} ({task.durationMinutes}m)</span>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50">
                                <h3 className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Observações</h3>
                                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {task.description || "Nenhuma observação fornecida."}
                                </p>
                            </div>

                            {/* Stats */}
                            {(task.rescheduleCount || 0) > 0 && (
                                <div className="text-xs text-slate-500">
                                    Reagendado {task.rescheduleCount} vezes
                                </div>
                            )}
                        </div>
                    </motion.div>

                    <ConfirmDeleteModal
                        isOpen={showDeleteModal}
                        onClose={() => setShowDeleteModal(false)}
                        onConfirm={handleDeleteConfirm}
                        taskTitle={task.title}
                        isRecurring={isRecurring}
                        canDeleteSeries={canDeleteSeries}
                    />
                </div>
            )}
        </AnimatePresence>
    );
};
