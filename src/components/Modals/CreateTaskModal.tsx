import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Calendar, ArrowRight } from 'lucide-react';
import { format, differenceInMinutes, addHours, startOfHour, addMinutes } from 'date-fns';
import { playSound } from '../../utils/audio';
import { sanitizeText } from '../../utils/security';
import { useAuthStore } from '../../store/useAuthStore';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: Date;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, initialDate }) => {
    const { addTask } = useTaskStore();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dateStr, setDateStr] = useState('');
    const [startTimeStr, setStartTimeStr] = useState('');
    const [endTimeStr, setEndTimeStr] = useState('');
    const [error, setError] = useState('');

    // Recurrence states
    const [isRecurring, setIsRecurring] = useState(false);
    const [ruleType, setRuleType] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'custom'>('none');
    const [customDates, setCustomDates] = useState<string[]>([]);

    const [allowOverlap, setAllowOverlap] = useState(false);

    useEffect(() => {
        if (isOpen) {
            playSound('popup');
            const baseDate = initialDate || new Date();
            setDateStr(format(baseDate, 'yyyy-MM-dd'));

            const nextHour = addHours(startOfHour(new Date()), 1);
            setStartTimeStr(format(nextHour, 'HH:mm'));
            setEndTimeStr(format(addHours(nextHour, 1), 'HH:mm'));

            setTitle('');
            setDescription('');
            setError('');
            setIsRecurring(false);
            setRuleType('none');
            setCustomDates([]);
            setAllowOverlap(false);
        }
    }, [isOpen, initialDate]);

    const handleSubmit = (e: React.FormEvent) => {
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
            now.setSeconds(0, 0); // Ignore seconds for comparison
            if (start < now) {
                setError('Não é permitido agendar tarefas no passado. Ajuste a data e o horário.');
                return;
            }

            if (end <= start) {
                end.setDate(end.getDate() + 1);
            }

            if (!allowOverlap) {
                const { tasks } = useTaskStore.getState();
                const conflictingTask = tasks.find(t => {
                    if (t.status === 'cancelled' || t.status === 'completed') return false;
                    const tStart = new Date(t.startTime);
                    if (isNaN(tStart.getTime())) return false;
                    const duration = Number(t.durationMinutes) || 30;
                    const tEnd = addMinutes(tStart, duration);
                    const isOverlapping = start < tEnd && end > tStart;
                    if (!isOverlapping) return false;
                    return t.allowOverlap !== true;
                });

                if (conflictingTask) {
                    setError(`Conflito de horário com '${conflictingTask.title}'. Marque a caixa 'Permitir sobreposição' para forçar o agendamento.`);
                    return;
                }
            }

            const duration = differenceInMinutes(end, start);

            addTask({
                title: sanitizeText(title, 100),
                description: sanitizeText(description, 500),
                startTime: start,
                durationMinutes: duration,
                allowOverlap,
                userId: useAuthStore.getState().user?.id || '',
                recurrence: isRecurring ? {
                    seriesId: crypto.randomUUID(),
                    ruleType,
                    createdAt: new Date().toISOString(),
                    customDates: ruleType === 'custom' ? customDates : undefined
                } : undefined
            });

            onClose();
        } catch (err) {
            setError('Formato de data ou hora inválido');
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">Nova Tarefa</h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" aria-label="Fechar">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Título</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="O que precisa ser feito?"
                                aria-label="Título da Tarefa"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-600"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Data</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 text-slate-500" size={18} />
                                <input
                                    type="date"
                                    value={dateStr}
                                    onChange={(e) => setDateStr(e.target.value)}
                                    aria-label="Data da Tarefa"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Início</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <input
                                        type="time"
                                        value={startTimeStr}
                                        onChange={(e) => setStartTimeStr(e.target.value)}
                                        aria-label="Horário de Início"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Fim</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <input
                                        type="time"
                                        value={endTimeStr}
                                        onChange={(e) => setEndTimeStr(e.target.value)}
                                        aria-label="Horário de Fim"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
                            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Observações</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Adicione detalhes, links ou notas..."
                                aria-label="Observações da Tarefa"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-600 resize-none h-20"
                            />
                        </div>

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
                            <p className="text-[10px] text-slate-500 mt-1 ml-6 leading-tight">
                                Permite agendar mesmo havendo conflitos e permite que tarefas futuras sobreponham esta.
                            </p>
                        </div>

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
                                            value={ruleType}
                                            onChange={(e) => setRuleType(e.target.value as any)}
                                            aria-label="Frequência de Repetição"
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
                                                    id="custom-date-adder"
                                                    aria-label="Adicionar data personalizada"
                                                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const input = document.getElementById('custom-date-adder') as HTMLInputElement;
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
                                                            aria-label="Remover data"
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
                            <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/50">
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
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                            >
                                Criar Tarefa
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
