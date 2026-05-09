import React from 'react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import { VitalityMeter } from '../Shared/VitalityMeter';

interface DateHeaderProps {
    onAddTask?: () => void;
}

export const DateHeader: React.FC<DateHeaderProps> = ({ onAddTask }) => {
    const { selectedDate, setSelectedDate } = useTaskStore();
    const dateInputRef = React.useRef<HTMLInputElement>(null);

    const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
    const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
    const handleToday = () => setSelectedDate(new Date());

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = new Date(e.target.value + 'T00:00:00');
        if (!isNaN(date.getTime())) {
            setSelectedDate(date);
        }
    };

    const triggerDatePicker = () => {
        dateInputRef.current?.showPicker?.();
        // Fallback for browsers that don't support showPicker
        if (!dateInputRef.current?.showPicker) {
            dateInputRef.current?.click();
        }
    };

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4 border-b border-border bg-background-secondary/80 backdrop-blur-md sticky top-0 z-10 transition-colors">
            <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-0.5 sm:gap-1">
                    <button
                        onClick={handlePrevDay}
                        className="p-1.5 sm:p-1 hover:bg-background-tertiary rounded-full transition-colors text-text-secondary hover:text-text-primary"
                        title="Dia anterior"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={handleNextDay}
                        className="p-1.5 sm:p-1 hover:bg-background-tertiary rounded-full transition-colors text-text-secondary hover:text-text-primary"
                        title="Próximo dia"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <div className="relative group flex items-center gap-1 sm:gap-2 cursor-pointer" onClick={triggerDatePicker}>
                    <h2 className="text-sm sm:text-lg font-bold text-text-primary capitalize transition-colors group-hover:text-blue-400 truncate max-w-[160px] sm:max-w-[300px]">
                        {format(selectedDate, 'EEEE, d MMMM', { locale: ptBR })}
                    </h2>
                    <CalendarIcon size={16} className="text-text-secondary group-hover:text-blue-400 transition-colors flex-shrink-0" />
                    <input
                        ref={dateInputRef}
                        type="date"
                        className="absolute opacity-0 pointer-events-none w-0 h-0"
                        onChange={handleDateChange}
                        value={format(selectedDate, 'yyyy-MM-dd')}
                        title="Selecionar data"
                    />
                </div>

                <div className="hidden md:block ml-4">
                    <VitalityMeter />
                </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
                {onAddTask && (
                    <button
                        onClick={onAddTask}
                        id="add-task-button"
                        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-600/20"
                        title="Nova Tarefa"
                    >
                        <Plus size={16} />
                        <span className="text-xs hidden sm:inline">Nova Tarefa</span>
                    </button>
                )}
                {!isToday(selectedDate) && (
                    <button
                        onClick={handleToday}
                        className="text-xs font-medium px-2.5 sm:px-3 py-1.5 bg-background-tertiary hover:bg-border text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                    >
                        Hoje
                    </button>
                )}
                <div className="hidden sm:flex items-center gap-2 text-text-secondary bg-background-tertiary px-3 py-1.5 rounded-lg transition-colors">
                    <CalendarIcon size={14} />
                    <span className="text-xs">{format(selectedDate, 'yyyy')}</span>
                </div>
            </div>
        </div>
    );
};
