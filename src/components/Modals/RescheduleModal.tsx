import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { format, addHours, startOfHour, addMinutes } from 'date-fns';

interface RescheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId: string;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({ isOpen, onClose, taskId }) => {
    const { rescheduleTask, tasks, closeRescheduleModal } = useTaskStore();
    const task = tasks.find(t => t.id === taskId);

    const [newTime, setNewTime] = useState<string>('');
    const [allowOverlap, setAllowOverlap] = useState(false);
    const [applyToSeries, setApplyToSeries] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && task) {
            // Default to next hour if in past, or keep current planned time if future?
            // User usually wants to reschedule because they missed it, so next hour is reasonable default.
            setNewTime(format(addHours(startOfHour(new Date()), 1), "yyyy-MM-dd'T'HH:mm"));
            setAllowOverlap(task.allowOverlap || false);
            setApplyToSeries(false);
            setError('');
        }
    }, [isOpen, task]);

    if (!isOpen || !task) return null;

    const handleConfirm = async () => {
        const selectedTime = new Date(newTime);
        const now = new Date();
        now.setSeconds(0, 0);

        if (selectedTime < now) {
            setError('Não é permitido agendar tarefas no passado. Ajuste a data e o horário.');
            return;
        }

        // OVERLAP VALIDATION
        // Validating ONLY the rescheduled instance against existing tasks.
        // Validating the entire series would be too heavy and complex for this modal.
        if (!allowOverlap) {
            const start = selectedTime;
            const end = addMinutes(start, task.durationMinutes);

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

                // CRITICAL: Block if EITHER the new task (via checkbox) OR the existing task DOES NOT allow overlap.
                // The current check `t.allowOverlap !== true` is correct for blocking based on the EXISTING task's preference.
                // However, the user request emphasizes "mensagem que diz haver sobreposição com a tarefa tal".
                // We should ensure the error message is clear.
                return true; // We found an overlap. Validation logic below decides if it's a conflict.
            });

            if (conflictingTask) {
                // Check if the CONFLICTING task allows overlap.
                // If conflicting task allows overlap, AND we are just scheduling (not starting), is it a hard block?
                // Visual rule: If I schedule a task over another, and I haven't checked "Allow Overlap",
                // I am effectively saying "I want this time slot exclusive".
                // If there is ANY task there, it's a conflict unless IT explicitly allows overlap AND I explicitly allow overlap?
                // Usually:
                // If Existing says "Allow Overlap" = OK to overlap it?
                // If New says "Allow Overlap" = OK to overlap others?
                // The most conservative rule (used in Create/Edit) is:
                // If Overlap exists:
                //    Block UNLESS (NewTask.allowOverlap == true AND ExistingTask.allowOverlap == true) ? 
                //    Or just NewTask.allowOverlap == true?
                //    
                //    Let's look at `EditTaskModal` validation again if possible, or stick to the user prompt:
                //    "tem uma sobreposição com uma tarefa que não tem a opção "permitir sobreposição" assinalada, então deve aparecer mensagem"
                //    This confirms: IF existing task.allowOverlap is FALSE, we MUST block (or warn).
                //    Even if WE check "allow overlap" on the new/rescheduling task, can we overlap a "Blocking" task?
                //    Technically no, a "Blocking" task demands exclusivity.
                //    So: Block if ExistingTask.allowOverlap is FALSE.

                if (!conflictingTask.allowOverlap) {
                    setError(`Conflito com "${conflictingTask.title}" (que não permite sobreposição).`);
                    return;
                }

                // If existing task ALLOWS overlap, but we haven't checked our checkbox?
                // Then WE are demanding exclusivity, so it's still a conflict for US.
                // User said: "precisa assinalar para poder agendar".
                // This implies that checking the box SHOULD resolve it.
                // So the logic is:
                // If Overlap exists:
                //    If we checked "Allow Overlap": PROCEED (assuming we can overlap anything or at least non-blocking things? User said "precisa assinalar para poder agendar", implies checking it fixes the block).
                //    If we did NOT check "Allow Overlap": BLOCK.

                // Wait, if existing task is exclusive, checking OUR box shouldn't override it?
                // But the user prompt says: "tem uma sobreposição com uma tarefa que não tem a opção "permitir sobreposição" assinalada... e que precisa assinalar para poder agendar".
                // This suggests that checking the box on the CURRENT (rescheduling) task is the key to proceeding.
                // Let's implement standard "Block if overlap found AND !allowOverlap".
                // Existing code already does: if (!allowOverlap) { find conflict }
                // So if we check allowOverlap, this block is skipped entirely.
                // This matches "precisa assinalar para poder agendar".

                // So the only refinement is to ensure the message is clear.
                setError(`Conflito de horário com "${conflictingTask.title}". Habilite "Permitir Conflitos" se deseja forçar o agendamento.`);
                return;
            }
        }

        await rescheduleTask(task.id, selectedTime, { allowOverlap, applyToSeries });
        closeRescheduleModal();
        onClose(); // Call prop as well for consistency
    };

    const isRecurring = !!task.recurrence;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                >
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-400">
                            <CalendarClock size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Reagendar Tarefa</h2>
                        <p className="text-slate-400 text-sm mb-1">
                            Defina um novo horário para:
                        </p>
                        <p className="text-white font-medium truncate px-4">
                            "{task.title}"
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 mb-6">
                        {/* Time Input */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Novo Horário</label>
                            <input
                                type="datetime-local"
                                id="reschedule-time-input"
                                aria-label="Novo horário da tarefa"
                                value={newTime}
                                onChange={(e) => {
                                    setNewTime(e.target.value);
                                    setError('');
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>

                        {/* Allow Overlap Checkbox */}
                        <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer border border-transparent hover:border-slate-700 transition-colors">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${allowOverlap ? 'bg-purple-600 border-purple-600' : 'border-slate-600'}`}>
                                {allowOverlap && <Check size={14} className="text-white" />}
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={allowOverlap}
                                onChange={(e) => {
                                    setAllowOverlap(e.target.checked);
                                    setError('');
                                }}
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-200">Permitir Conflitos</span>
                                <span className="text-xs text-slate-500">Ignora alertas de sobreposição</span>
                            </div>
                        </label>

                        {/* Apply to Series Checkbox (if recurring) */}
                        {isRecurring && (
                            <label className="flex items-center gap-3 p-3 bg-blue-900/10 rounded-lg cursor-pointer border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${applyToSeries ? 'bg-blue-600 border-blue-600' : 'border-slate-600'}`}>
                                    {applyToSeries && <RefreshCw size={12} className="text-white" />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={applyToSeries}
                                    onChange={(e) => setApplyToSeries(e.target.checked)}
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-blue-200">Atualizar Série Futura</span>
                                    <span className="text-xs text-blue-400/70">Aplica o novo horário para todas as repetições seguintes</span>
                                </div>
                            </label>
                        )}

                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                closeRescheduleModal();
                                onClose();
                            }}
                            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            <Check size={18} />
                            Confirmar
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
