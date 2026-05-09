import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { useAuthStore } from '../../store/useAuthStore';
import { playSound } from '../../utils/audio';
import { useEffect } from 'react';
import { sanitizeText } from '../../utils/security';

interface CreateHabitModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const COLORS = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
    'bg-rose-500'
];

const DAYS = [
    { label: 'D', value: 0 },
    { label: 'S', value: 1 },
    { label: 'T', value: 2 },
    { label: 'Q', value: 3 },
    { label: 'Q', value: 4 },
    { label: 'S', value: 5 },
    { label: 'S', value: 6 },
];

export const CreateHabitModal: React.FC<CreateHabitModalProps> = ({ isOpen, onClose }) => {
    const { addHabit } = useHabitStore();
    const [title, setTitle] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[10]); // Default blue
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default Mon-Fri

    useEffect(() => {
        if (isOpen) playSound('popup');
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || selectedDays.length === 0) return;

        addHabit({
            title: sanitizeText(title, 50),
            color: selectedColor,
            daysOfWeek: selectedDays,
            userId: useAuthStore.getState().user?.id || '',
        });

        setTitle('');
        setSelectedDays([1, 2, 3, 4, 5]);
        onClose();
    };

    const toggleDay = (day: number) => {
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter(d => d !== day));
        } else {
            setSelectedDays([...selectedDays, day].sort());
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="flex justify-between items-center p-4 border-b border-slate-800">
                            <h2 className="text-lg font-semibold text-white">Novo Hábito</h2>
                            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" aria-label="Fechar">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Title Input */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Nome do Hábito
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="ex: Ler Bíblia, Academia, Beber Água"
                                    aria-label="Nome do Hábito"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    autoFocus
                                />
                            </div>

                            {/* Frequency Selector */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Frequência
                                </label>
                                <div className="flex justify-between gap-2">
                                    {DAYS.map((day) => (
                                        <button
                                            key={day.value}
                                            type="button"
                                            onClick={() => toggleDay(day.value)}
                                            aria-label={`Repetir às ${day.label}`}
                                            className={`
                                                w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all
                                                ${selectedDays.includes(day.value)
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-105'
                                                    : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                                                }
                                            `}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color Picker */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Cor
                                </label>
                                <div className="flex flex-wrap gap-3">
                                    {COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setSelectedColor(color)}
                                            aria-label={`Selecionar cor ${color}`}
                                            className={`w-6 h-6 rounded-full transition-transform ${color} ${selectedColor === color ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!title.trim() || selectedDays.length === 0}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
                                >
                                    Criar Hábito
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
