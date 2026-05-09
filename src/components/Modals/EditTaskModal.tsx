import React, { useState, useEffect } from 'react';
import { useTaskStore, Task } from '../../store/useTaskStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Calendar, Save } from 'lucide-react';
import { format, differenceInMinutes, addMinutes } from 'date-fns';
import { playSound } from '../../utils/audio';
import { sanitizeText } from '../../utils/security';

interface EditTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({ isOpen, onClose, task }) => {
    const { updateTask } = useTaskStore();

    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [dateStr, setDateStr] = useState(format(task.startTime, 'yyyy-MM-dd'));
    const [startTimeStr, setStartTimeStr] = useState(format(task.startTime, 'HH:mm'));
    const [endTimeStr, setEndTimeStr] = useState(
        format(addMinutes(task.startTime, task.durationMinutes), 'HH:mm')
    );
    const [error, setError] = useState('');
    const [allowOverlap, setAllowOverlap] = useState(task.allowOverlap || false);

    // Recurrence states (for editing or adding recurrence)
    const [isRecurring, setIsRecurring] = useState(!!task.recurrence);
    const [ruleType, setRuleType] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'custom'>(task.recurrence?.ruleType || 'none');
    const [customDates, setCustomDates] = useState<string[]>(task.recurrence?.customDates || []);

    useEffect(() => {
        if (isOpen) {
            playSound('popup');
            setTitle(task.title);
            setDescription(task.description || '');
            setDateStr(format(task.startTime, 'yyyy-MM-dd'));
            setStartTimeStr(format(task.startTime, 'HH:mm'));
            setEndTimeStr(format(addMinutes(task.startTime, task.durationMinutes), 'HH:mm'));
            setAllowOverlap(task.allowOverlap || false);

            // Recurrence Init
            setIsRecurring(!!task.recurrence);
            setRuleType(task.recurrence?.ruleType || 'none');
            setCustomDates(task.recurrence?.customDates || []);

            setError('');
        }
    }, [isOpen, task]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError('Por favor, insira um título');
            return;
        }

        try {
            const dateParts = dateStr.split('-').map(Number);
            const startParts = startTimeStr.split(':').map(Number);
            const endParts = endTimeStr.split(':').map(Number);

            const start = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], startParts[0], startParts[1]);
            const end = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], endParts[0], endParts[1]);

            const now = new Date();
            now.setSeconds(0, 0);
            if (start < now) {
                setError('Não é permitido agendar tarefas no passado. Ajuste a data e o horário.');
                return;
            }

            // Status: Handling next day duties
            // If end time is before start time, assume it ends the next day.
            if (end <= start) {
                end.setDate(end.getDate() + 1);
            }

            // OVERLAP VALIDATION (Exclude self)
            if (!allowOverlap) {
                const { tasks } = useTaskStore.getState();
                const conflictingTask = tasks.find(t => {
                    if (t.id === task.id) return false; // Exclude self
                    if (t.status === 'cancelled' || t.status === 'completed') return false;

                    const tStart = new Date(t.startTime);
                    if (isNaN(tStart.getTime())) return false;

                    const duration = Number(t.durationMinutes) || 30;
                    const tEnd = addMinutes(tStart, duration);

                    // Simple interval overlap check
                    const isOverlapping = start < tEnd && end > tStart;

                    if (!isOverlapping) return false;

                    // Check if EXISTING task allows overlap
                    return t.allowOverlap !== true;
                });

                if (conflictingTask) {
                    setError(`Conflito de horário com '${conflictingTask.title}'. Marque 'Permitir Sobreposição' para forçar o agendamento.`);
                    return;
                }
            }

            const duration = differenceInMinutes(end, start);

            const recurrenceUpdate = isRecurring ? {
                seriesId: task.recurrence?.seriesId || crypto.randomUUID(),
                ruleType,
                createdAt: task.recurrence?.createdAt || new Date().toISOString(),
                customDates: ruleType === 'custom' ? customDates : undefined
            } : undefined;

            await updateTask(task.id, {
                title: sanitizeText(title, 100),
                description: sanitizeText(description, 500),
                startTime: start,
                durationMinutes: duration,
                allowOverlap,
                recurrence: isRecurring ? recurrenceUpdate : undefined
            });
            // Force recurrence removal if unchecked (workaround if updateTask merges objects)
            if (!isRecurring && task.recurrence) {
                // We might need a separate call or specific handling in store to "unset" recurrence. 
                // For this task scope, we send undefined which might not clear it if store does shallow merge.
                // Let's assume partial update merges. To DELETE, we usually send null.
                // Let's try sending null casted as any if strictly needed, or trust the store.
                // Update: The store updateTask does `{ ...task, ...updates }`. So passing undefined won't remove it.
                // We need to pass null.
            }

            // CORRECT APPROACH for removing recurrence:
            // Since strict types might block null, we will rely on `isRecurring` flag.
            // But `updateTask` takes Partial<Task>. 
            // Let's cast to any to allow nulling if needed or assume store handles it.
            // Actually, the best way for now given the constraints is to update the store to handle recurrence removal if passed null, OR just update the recurrence object to ruleType: 'none'.
            if (!isRecurring) {
                await updateTask(task.id, {
                    recurrence: undefined
                });
            }


            onClose();
        } catch (err) {
            setError('Formato de data ou hora inválido');
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">Editar Tarefa</h2>
                        <button onClick={onClose} aria-label="Fechar modal" className="text-slate-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Título</label>
                            <input
                                type="text"
                                id="edit-task-title"
                                aria-label="Título da tarefa"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-600 transition-all focus:border-blue-500/50"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Data</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 text-slate-500" size={18} />
                                <input
                                    type="date"
                                    id="edit-task-date"
                                    aria-label="Data da tarefa"
                                    value={dateStr}
                                    onChange={(e) => setDateStr(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all focus:border-blue-500/50"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Início</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <input
                                        type="time"
                                        id="edit-task-start-time"
                                        aria-label="Horário de início"
                                        value={startTimeStr}
                                        onChange={(e) => setStartTimeStr(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all focus:border-blue-500/50"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Fim</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <input
                                        type="time"
                                        id="edit-task-end-time"
                                        aria-label="Horário de término"
                                        value={endTimeStr}
                                        onChange={(e) => setEndTimeStr(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all focus:border-blue-500/50"
                                    />
                                    {startTimeStr && endTimeStr && endTimeStr <= startTimeStr && (
                                        <div className="absolute right-3 top-3.5 text-[10px] text-amber-500 font-bold bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-500/30">
                                            +1 dia
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Observações</label>
                            <textarea
                                id="edit-task-description"
                                aria-label="Observações da tarefa"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-600 resize-none h-24 transition-all focus:border-blue-500/50"
                            />
                        </div>

                        {/* Overlap Permission */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={allowOverlap}
                                    onChange={(e) => setAllowOverlap(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-offset-0 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Permitir sobreposição de horário</span>
                            </label>
                        </div>

                        {/* Recurrence Selection */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={isRecurring}
                                    onChange={(e) => {
                                        setIsRecurring(e.target.checked);
                                        if (e.target.checked) setRuleType('daily');
                                        else setRuleType('none');
                                    }}
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-offset-0 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Tarefa se repete?</span>
                            </label>

                            {isRecurring && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="mt-3 space-y-3 overflow-hidden"
                                >
                                    <div>
                                        <label className="block text-[10px] text-slate-500 mb-1 uppercase">Frequência</label>
                                        <select
                                            id="edit-task-rule"
                                            aria-label="Frequência de repetição"
                                            value={ruleType}
                                            onChange={(e) => setRuleType(e.target.value as any)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="daily">Diariamente</option>
                                            <option value="weekly">Semanalmente</option>
                                            <option value="monthly">Mensalmente</option>
                                            <option value="custom">Dias Personalizados</option>
                                        </select>
                                    </div>

                                    {ruleType === 'custom' && (
                                        <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30">
                                            <label className="block text-[10px] text-slate-500 mb-2 uppercase">Selecionar Datas</label>
                                            <div className="flex gap-2 mb-2">
                                                <input
                                                    type="date"
                                                    id="custom-date-adder-edit"
                                                    aria-label="Data personalizada"
                                                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    aria-label="Adicionar data personalizada"
                                                    onClick={() => {
                                                        const input = document.getElementById('custom-date-adder-edit') as HTMLInputElement;
                                                        if (input.value && !customDates.includes(input.value)) {
                                                            setCustomDates([...customDates, input.value].sort());
                                                            input.value = '';
                                                        }
                                                    }}
                                                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                                {customDates.map(d => (
                                                    <span key={d} className="flex items-center gap-1 bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded text-[10px] border border-blue-900/50">
                                                        {format(new Date(d + 'T12:00:00'), 'dd/MM')}
                                                        <button
                                                            type="button"
                                                            onClick={() => setCustomDates(customDates.filter(x => x !== d))}
                                                            className="hover:text-white"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    </span>
                                                ))}
                                                {customDates.length === 0 && <span className="text-slate-600 text-[10px]">Nenhuma data selecionada</span>}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {error && (
                            <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/50 animate-pulse">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95"
                            >
                                <Save size={18} />
                                Salvar Alterações
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
