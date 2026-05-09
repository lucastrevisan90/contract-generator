import React, { useMemo } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    addYears,
    subYears
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { VitalityMeter } from '../Shared/VitalityMeter';

interface MonthViewProps {
    onSelectDate: (date: Date) => void;
}

// Day name abbreviations for different screen sizes
const DAY_NAMES_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DAY_NAMES_FULL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export const MonthView: React.FC<MonthViewProps> = ({ onSelectDate }) => {
    const { tasks, selectedDate, setSelectedDate } = useTaskStore();

    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(selectedDate));
        const end = endOfWeek(endOfMonth(selectedDate));
        return eachDayOfInterval({ start, end });
    }, [selectedDate]);

    const getTasksForDay = (date: Date) => {
        return tasks.filter(task => isSameDay(task.startTime, date));
    };

    const nextMonth = () => {
        setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
    };

    const nextYear = () => setSelectedDate(addYears(selectedDate, 1));
    const prevYear = () => setSelectedDate(subYears(selectedDate, 1));
    const goToCurrentMonth = () => setSelectedDate(new Date());

    const isCurrentMonth = isSameMonth(selectedDate, new Date());

    return (
        <div className="flex flex-col h-full w-full bg-background-primary border border-border rounded-xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border bg-background-secondary/50">
                <h2 className="text-base sm:text-xl font-bold text-text-primary capitalize flex items-center gap-2 sm:gap-3">
                    {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
                    {!isCurrentMonth && (
                        <button
                            onClick={goToCurrentMonth}
                            className="text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 sm:py-1.5 bg-background-tertiary hover:bg-border text-text-secondary rounded-lg transition-colors border border-border"
                        >
                            Mês Atual
                        </button>
                    )}
                </h2>
                <div className="hidden md:block">
                    <VitalityMeter compact />
                </div>
                <div className="flex gap-0.5 sm:gap-1">
                    <button onClick={prevYear} className="p-1.5 sm:p-2 hover:bg-background-tertiary rounded-lg text-text-secondary hover:text-text-primary transition-colors" title="Ano Anterior">
                        <ChevronsLeft size={18} />
                    </button>
                    <button onClick={prevMonth} className="p-1.5 sm:p-2 hover:bg-background-tertiary rounded-lg text-text-secondary hover:text-text-primary transition-colors" title="Mês Anterior">
                        <ChevronLeft size={18} />
                    </button>
                    <button onClick={nextMonth} className="p-1.5 sm:p-2 hover:bg-background-tertiary rounded-lg text-text-secondary hover:text-text-primary transition-colors" title="Próximo Mês">
                        <ChevronRight size={18} />
                    </button>
                    <button onClick={nextYear} className="p-1.5 sm:p-2 hover:bg-background-tertiary rounded-lg text-text-secondary hover:text-text-primary transition-colors" title="Próximo Ano">
                        <ChevronsRight size={18} />
                    </button>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-border bg-background-secondary/30">
                {DAY_NAMES_FULL.map((day, i) => (
                    <div key={day} className="py-1.5 sm:py-2 text-center text-[10px] sm:text-xs font-medium text-text-secondary uppercase tracking-wider">
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{DAY_NAMES_SHORT[i]}</span>
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6 bg-background-primary">
                {days.map((day) => {
                    const dayTasks = getTasksForDay(day);
                    const isCurrentMonth = isSameMonth(day, selectedDate);

                    return (
                        <div
                            key={day.toString()}
                            onClick={() => {
                                setSelectedDate(day);
                                onSelectDate(day);
                            }}
                            className={`
                                min-h-[56px] sm:min-h-[80px] border-b border-r border-border/50 p-1 sm:p-2 cursor-pointer transition-colors
                                ${isCurrentMonth ? 'bg-transparent hover:bg-background-secondary/40' : 'bg-background-secondary/20 text-text-secondary'}
                                ${isToday(day) ? 'bg-accent/10' : ''}
                            `}
                        >
                            <div className="flex justify-between items-start mb-0.5 sm:mb-1">
                                <span className={`
                                    text-xs sm:text-sm font-medium w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full
                                    ${isToday(day) ? 'bg-accent text-white' : 'text-text-secondary'}
                                `}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            <div className="flex flex-col gap-0.5 sm:gap-1">
                                {dayTasks.slice(0, 2).map(task => (
                                    <div
                                        key={task.id}
                                        className={`
                                            text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded truncate
                                            ${(task.status === 'completed' || task.status === 'cancelled') ? 'bg-background-tertiary text-text-secondary line-through opacity-60' : 'bg-accent/20 text-text-primary border border-accent/20'}
                                        `}
                                    >
                                        {task.title}
                                    </div>
                                ))}
                                {dayTasks.length > 2 && (
                                    <div className="text-[8px] sm:text-[10px] text-text-secondary pl-1">
                                        + {dayTasks.length - 2} mais
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
