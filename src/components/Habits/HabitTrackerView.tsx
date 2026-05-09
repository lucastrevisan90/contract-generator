import React, { useState, useMemo } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isToday,
    addMonths, subMonths, getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHabitStore } from '../../store/useHabitStore';
import { CreateHabitModal } from '../Modals/CreateHabitModal';
import { playSound } from '../../utils/audio';

export const HabitTrackerView: React.FC = () => {
    const { habits, completions, toggleHabitCompletion, deleteHabit, vitality, streakCount } = useHabitStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Calendar Logic
    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentDate));
        const end = endOfWeek(endOfMonth(currentDate));
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));



    const getMoodEmoji = (v: number) => {
        if (v >= 80) return '🤩';
        if (v >= 40) return '😐';
        return '😞';
    };

    return (
        <div className="p-4 sm:p-6 w-full space-y-8 pb-24 h-full flex flex-col">
            {/* Header & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <Check className="text-green-500" />
                        Hábitos Diários
                    </h2>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={20} />
                        Novo Hábito
                    </button>

                    {/* Mini Stats Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-background-secondary border border-border p-3 rounded-lg flex flex-col items-center justify-center text-center">
                            <div className="text-[28px] mb-1">{getMoodEmoji(vitality)}</div>
                            <div className="text-xs font-bold text-text-primary uppercase tracking-tighter">Vitalidade</div>
                            <div className="text-lg font-black text-accent">{vitality}%</div>
                        </div>
                        <div className="bg-background-secondary border border-border p-3 rounded-lg flex flex-col justify-center">
                            <div className="text-text-secondary text-[10px] uppercase font-bold mb-1 flex items-center gap-1"><Flame size={12} className="text-orange-500" /> Sequência</div>
                            <div className="text-xl font-bold text-text-primary">{streakCount} <span className="text-xs font-normal text-text-secondary">dias</span></div>
                        </div>
                    </div>

                    {/* Vitality Progress Bar */}
                    <div id="vitality-card" className="bg-background-secondary border border-border p-4 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-text-secondary">
                            <span>Energia Atual</span>
                            <span>{vitality}/100</span>
                        </div>
                        <div className="h-2.5 bg-background-tertiary rounded-full overflow-hidden p-0.5 border border-border">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${vitality}%` }}
                                className={`h-full rounded-full ${vitality >= 80 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : vitality >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            />
                        </div>
                    </div>
                </div>

                {/* Calendar Section */}
                <div className="md:col-span-3 bg-background-primary border border-border rounded-xl overflow-hidden shadow-xl flex flex-col">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border bg-background-secondary/50">
                        <h3 className="text-xl font-bold text-text-primary capitalize">
                            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={prevMonth} aria-label="Mês anterior" className="p-2 hover:bg-background-tertiary rounded-full text-text-secondary hover:text-text-primary transition-colors">
                                <ChevronLeft size={20} />
                            </button>
                            <button onClick={nextMonth} aria-label="Próximo mês" className="p-2 hover:bg-background-tertiary rounded-full text-text-secondary hover:text-text-primary transition-colors">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Days Header */}
                    <div className="grid grid-cols-7 border-b border-border bg-background-secondary/30">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(day => (
                            <div key={day} className="py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-background-primary min-h-[500px]">
                        {days.map((day) => {
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const dayOfWeek = getDay(day);
                            const dateStr = format(day, 'yyyy-MM-dd');

                            // Get habits for this day
                            const daysHabits = habits.filter(h => h.daysOfWeek.includes(dayOfWeek));

                            return (
                                <div
                                    key={day.toString()}
                                    className={`
                                        border-b border-r border-border/50 p-2 transition-colors relative group
                                        ${isCurrentMonth ? 'bg-transparent' : 'bg-background-secondary/20 text-text-secondary'}
                                        ${isToday(day) ? 'bg-accent/5' : ''}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`
                                            text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full
                                            ${isToday(day) ? 'bg-accent text-white' : 'text-text-secondary'}
                                        `}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5">
                                        {daysHabits.map(habit => {
                                            const isCompleted = completions.some(c => c.habitId === habit.id && c.date === dateStr);

                                            return (
                                                <motion.button
                                                    key={habit.id}
                                                    whileTap={{ scale: 0.95 }}
                                                    aria-label={`Marcar hábito ${habit.title} como ${isCompleted ? 'incompleto' : 'concluído'}`}
                                                    onClick={() => {
                                                        if (!isCompleted) playSound('success');
                                                        toggleHabitCompletion(habit.id, dateStr);
                                                    }}
                                                    className={`
                                                        w-full text-left text-xs sm:text-[10px] min-h-[44px] sm:min-h-0 px-3 sm:px-2 py-2 sm:py-1.5 rounded-lg sm:rounded-md flex items-center justify-between group/habit
                                                        transition-all duration-200 border
                                                        ${isCompleted
                                                            ? `${habit.color.replace('bg-', 'bg-').replace('500', '500/20')} ${habit.color.replace('bg-', 'text-').replace('500', '300')} ${habit.color.replace('bg-', 'border-').replace('500', '500/30')}`
                                                            : 'bg-background-secondary text-text-secondary border-border hover:border-text-secondary hover:bg-background-tertiary'
                                                        }
                                                    `}
                                                >
                                                    <span className={`truncate ${isCompleted ? 'line-through opacity-70' : ''}`}>
                                                        {habit.title}
                                                    </span>
                                                    {isCompleted && <Check size={10} />}
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Habits Management List */}
            <div className="bg-background-secondary border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Gerenciar Hábitos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {habits.map(habit => (
                        <div key={habit.id} className="flex items-center justify-between p-4 bg-background-primary border border-border rounded-lg group hover:border-text-secondary transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${habit.color}`} />
                                <div>
                                    <div className="font-medium text-text-primary">{habit.title}</div>
                                    <div className="text-xs text-text-secondary flex gap-1">
                                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                                            <span key={i} className={habit.daysOfWeek.includes(i) ? 'text-accent' : 'text-text-secondary/50'}>{d}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => deleteHabit(habit.id)}
                                title="Excluir Hábito"
                                className="p-3 sm:p-2 text-text-secondary hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={18} className="sm:w-4 sm:h-4" />
                            </button>
                        </div>
                    ))}
                    {habits.length === 0 && (
                        <div className="col-span-full text-center py-8 text-text-secondary">
                            Nenhum hábito criado ainda. Clique em "Novo Hábito" para começar!
                        </div>
                    )}
                </div>
            </div>

            <CreateHabitModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
};
