import React, { useMemo, useState } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, eachDayOfInterval, subDays, addMinutes } from 'date-fns';
import { BarChart3, CheckCircle2, Clock, Calendar, XCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { generateProductivityReport } from '../../utils/ProductivityReport';
import { useAuthStore } from '../../store/useAuthStore';
import { useHabitStore } from '../../store/useHabitStore';
import { Download } from 'lucide-react';

type TimeRange = 'day' | 'week' | 'month' | 'year' | 'all' | 'custom';

const getTaskOverdueMinutes = (t: any) => {
    if (t.status === 'completed' && t.completedAt) {
        try {
            const start = t.startTime instanceof Date ? t.startTime : new Date(t.startTime);
            const plannedEnd = addMinutes(start, Number(t.durationMinutes) || 0);
            const completedDate = t.completedAt instanceof Date ? t.completedAt : new Date(t.completedAt);

            if (!isNaN(completedDate.getTime()) && !isNaN(plannedEnd.getTime()) && completedDate > plannedEnd) {
                return Math.floor((completedDate.getTime() - plannedEnd.getTime()) / 60000);
            }
        } catch (e) {
            return 0;
        }
    }
    return 0;
};

const getTaskPushedMinutes = (t: any) => {
    let mins = Number(t.pushedMinutesCaused) || 0;

    if (t.originalPlannedStartAt) {
        try {
            const planned = new Date(t.originalPlannedStartAt);
            const actual = t.startTime instanceof Date ? t.startTime : new Date(t.startTime);

            if (!isNaN(planned.getTime()) && !isNaN(actual.getTime()) && actual > planned) {
                const diff = Math.floor((actual.getTime() - planned.getTime()) / 60000);
                mins = Math.max(mins, diff);
            }
        } catch (e) {
            // keep existing mins
        }
    }

    return isNaN(mins) ? 0 : mins;
};

export const StatsView: React.FC = () => {
    const { tasks } = useTaskStore();
    const [timeRange, setTimeRange] = useState<TimeRange>('week');
    const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isGenerating, setIsGenerating] = useState(false);

    const { profile } = useAuthStore();
    const { habits, completions } = useHabitStore();

    // Filter tasks based on range
    const filteredTasks = useMemo(() => {
        const now = new Date();
        let start: Date, end: Date;

        switch (timeRange) {
            case 'day':
                start = startOfDay(now);
                end = endOfDay(now);
                break;
            case 'week':
                start = startOfWeek(now, { weekStartsOn: 1 });
                end = endOfWeek(now, { weekStartsOn: 1 });
                break;
            case 'month':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'year':
                start = startOfYear(now);
                end = endOfYear(now);
                break;
            case 'all':
                return tasks;
            case 'custom':
                start = startOfDay(new Date(customStart));
                end = endOfDay(new Date(customEnd));
                break;
            default:
                start = startOfWeek(now);
                end = endOfWeek(now);
        }

        return tasks.filter(t => isWithinInterval(new Date(t.startTime), { start, end }));
    }, [tasks, timeRange]);

    // Calculate Metrics
    const metrics = useMemo(() => {
        const total = filteredTasks.length;
        const completed = filteredTasks.filter(t => t.status === 'completed');
        const completedCount = completed.length;
        const cancelled = filteredTasks.filter(t => t.status === 'cancelled').length;

        // Pushed minutes
        const totalPushedMinutes = filteredTasks.reduce((acc, t) => acc + getTaskPushedMinutes(t), 0);

        // Overdue metrics
        const overdueTasks = filteredTasks.filter(t => getTaskOverdueMinutes(t) > 0 || t.status === 'overdue');
        const overdueTasksCount = overdueTasks.length;
        const totalOverdueMinutes = filteredTasks.reduce((acc, t) => acc + getTaskOverdueMinutes(t), 0);
        const averageOverdueMinutes = overdueTasksCount > 0 ? Math.round(totalOverdueMinutes / overdueTasksCount) : 0;

        // Stability metrics
        const extensionsCount = filteredTasks.reduce((acc, t) => acc + (t.extensionsCount || 0), 0);
        const extendedMinutesTotal = filteredTasks.reduce((acc, t) => acc + (t.extendedMinutesTotal || 0), 0);
        const totalReschedules = filteredTasks.reduce((acc, t) => acc + (t.rescheduleCount || 0), 0);

        // Completion Rate & Stability Index
        const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

        const completedOnTime = completed.filter(t => getTaskOverdueMinutes(t) === 0).length;
        const onTimeCompletionRate = completedCount > 0 ? Math.round((completedOnTime / completedCount) * 100) : 0;

        // Stability Index Calculation (Additive penalties)
        let stabilityScore = 100;
        stabilityScore -= (totalReschedules * 2);
        stabilityScore -= (extensionsCount * 1);
        stabilityScore -= Math.floor(totalPushedMinutes / 30);
        stabilityScore -= (overdueTasksCount * 3);
        const scheduleStabilityIndex = Math.max(0, Math.min(100, stabilityScore));

        const totalDurationMinutes = filteredTasks.reduce((acc, t) => acc + t.durationMinutes, 0);
        const actualDurationMinutes = filteredTasks.reduce((acc, t) => acc + (t.actualDurationMinutes || 0), 0);

        return {
            total,
            completed: completedCount,
            cancelled,
            overdue: overdueTasksCount,
            totalOverdueMinutes,
            averageOverdueMinutes,
            totalPushedMinutes,
            extensionsCount,
            extendedMinutesTotal,
            rescheduleCount: totalReschedules,
            onTimeCompletionRate,
            scheduleStabilityIndex,
            totalDurationHours: (totalDurationMinutes / 60).toFixed(1),
            actualDurationHours: (actualDurationMinutes / 60).toFixed(1),
            completionRate
        };
    }, [filteredTasks]);

    // Chart Data (Daily breakdown for the selected range)
    const chartData = useMemo(() => {
        if (timeRange === 'day') return []; // No chart for single day yet

        const now = new Date();
        let start: Date, end: Date;

        if (timeRange === 'week') {
            start = startOfWeek(now, { weekStartsOn: 1 });
            end = endOfWeek(now, { weekStartsOn: 1 });
        } else if (timeRange === 'month') {
            start = startOfMonth(now);
            end = endOfMonth(now);
        } else if (timeRange === 'custom') {
            // Parse custom dates locally instead of as UTC string to avoid timezone offset shifts that flip start/end
            const [sYear, sMonth, sDay] = customStart.split('-').map(Number);
            const [eYear, eMonth, eDay] = customEnd.split('-').map(Number);
            start = startOfDay(new Date(sYear, sMonth - 1, sDay));
            end = endOfDay(new Date(eYear, eMonth - 1, eDay));

            if (start > end) {
                // Failsafe if end is before start
                const temp = start;
                start = end;
                end = temp;
            }
        } else if (timeRange === 'all' && tasks.length > 0) {
            // Find earliest and latest task
            const sortedTasks = [...tasks].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
            start = startOfDay(new Date(sortedTasks[0].startTime));
            end = endOfDay(now);

            // Limit to past 90 days max to prevent severe UI performance drop on massive accounts
            if (start < subDays(now, 90)) {
                start = subDays(now, 90);
            }
        } else {
            // Default to last 7 days for other views for now
            start = subDays(now, 6);
            end = now;
        }

        const days = eachDayOfInterval({ start, end });

        return days.map(day => {
            const dayInterval = { start: startOfDay(day), end: endOfDay(day) };
            const dayTasks = tasks.filter(t => isWithinInterval(new Date(t.startTime), dayInterval));

            const completed = dayTasks.filter(t => t.status === 'completed').length;
            const cancelled = dayTasks.filter(t => t.status === 'cancelled').length;
            const overdueMins = dayTasks.reduce((acc, t) => acc + getTaskOverdueMinutes(t), 0);
            const pushedMins = dayTasks.reduce((acc, t) => acc + getTaskPushedMinutes(t), 0);

            return {
                label: format(day, 'dd/MM'),
                completed,
                cancelled,
                total: dayTasks.length,
                overdueMinutes: overdueMins,
                pushedMinutes: pushedMins
            };
        });
    }, [tasks, timeRange]);

    const handleExport = async () => {
        setIsGenerating(true);
        try {
            const dateRangeLabel = timeRange === 'all' ? 'Todo o histórico' :
                timeRange === 'day' ? format(new Date(), 'dd/MM/yyyy') :
                    `${chartData[0]?.label} - ${chartData[chartData.length - 1]?.label}`;

            await generateProductivityReport({
                userName: profile?.full_name || 'Usuário',
                dateRange: dateRangeLabel,
                tasks: filteredTasks,
                habits,
                completions: completions,
                timeRangeLabels: chartData.map(d => d.label)
            });
        } catch (error) {
            console.error('Failed to generate report:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 w-full space-y-8 pb-24">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                    <BarChart3 className="text-blue-500" />
                    Análise de Produtividade
                </h2>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition-all border border-blue-400/20"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Gerando...
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                Exportar Relatório PDF
                            </>
                        )}
                    </button>

                    <div className="flex bg-background-secondary p-1 rounded-lg border border-border">
                        {(['day', 'week', 'month', 'year', 'all', 'custom'] as TimeRange[]).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                aria-label={`Filtrar por ${range}`}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeRange === range
                                    ? 'bg-accent text-white shadow-lg'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary'
                                    }`}
                            >
                                {range === 'day' ? 'Dia' :
                                    range === 'week' ? 'Semana' :
                                        range === 'month' ? 'Mês' :
                                            range === 'year' ? 'Ano' :
                                                range === 'all' ? 'Tudo' : 'Personalizado'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Custom Date Range Picker */}
            {timeRange === 'custom' && (
                <div className="flex justify-end">
                    <div className="flex items-center gap-2 bg-background-secondary p-2 rounded-lg border border-border animate-in fade-in slide-in-from-top-2">
                        <input
                            type="date"
                            aria-label="Data de início customizada"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="bg-background-tertiary border border-border text-text-primary rounded px-2 py-1 text-sm focus:outline-none focus:border-accent"
                        />
                        <span className="text-text-secondary text-sm">até</span>
                        <input
                            type="date"
                            aria-label="Data de fim customizada"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="bg-background-tertiary border border-border text-text-primary rounded px-2 py-1 text-sm focus:outline-none focus:border-accent"
                        />
                    </div>
                </div>
            )}

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <MetricCard
                    title="Taxa de Conclusão"
                    value={`${metrics.completionRate}%`}
                    icon={<CheckCircle2 size={20} className="text-green-500" />}
                    trend="vs período anterior"
                    color="green"
                />
                <MetricCard
                    title="No Horário"
                    value={`${metrics.onTimeCompletionRate}%`}
                    subtitle="Conclusão sem atrasos"
                    icon={<Clock size={20} className="text-emerald-500" />}
                    color="emerald"
                />
                <MetricCard
                    title="Estabilidade"
                    value={`${metrics.scheduleStabilityIndex}/100`}
                    subtitle="Índice de aderência"
                    icon={<BarChart3 size={20} className="text-purple-500" />}
                    color="purple"
                />
                <MetricCard
                    title="Total em Atraso"
                    value={`${metrics.totalOverdueMinutes}m`}
                    subtitle={`Média ${metrics.averageOverdueMinutes}m/tarefa`}
                    icon={<Clock size={20} className="text-red-500" />}
                    color="red"
                />
                <MetricCard
                    title="Tempo Empurrado"
                    value={`${metrics.totalPushedMinutes}m`}
                    subtitle="Impacto na agenda"
                    icon={<Calendar size={20} className="text-orange-500" />}
                    color="orange"
                />
                <MetricCard
                    title="Horas Focadas"
                    value={metrics.actualDurationHours}
                    subtitle={`de ${metrics.totalDurationHours} planejadas`}
                    icon={<Clock size={20} className="text-blue-500" />}
                    color="blue"
                />
                <MetricCard
                    title="Extensões"
                    value={metrics.extensionsCount}
                    subtitle={`${metrics.extendedMinutesTotal}m total`}
                    icon={<BarChart3 size={20} className="text-blue-500" />}
                    color="blue"
                />
                <MetricCard
                    title="Reagendadas"
                    value={metrics.rescheduleCount}
                    icon={<Calendar size={20} className="text-indigo-500" />}
                    color="indigo"
                />
                <MetricCard
                    title="Canceladas"
                    value={metrics.cancelled}
                    icon={<XCircle size={20} className="text-slate-500" />}
                    color="slate"
                />
                <MetricCard
                    title="Agendadas"
                    value={filteredTasks.filter(t => t.status === 'pending').length}
                    subtitle="Tarefas pendentes"
                    icon={<Clock size={20} className="text-indigo-500" />}
                    color="indigo"
                />
            </div>

            {/* Charts Section */}
            <div className="space-y-6">
                {/* Status Distribution */}
                <div className="bg-background-secondary border border-border rounded-xl p-6 flex flex-col justify-center">
                    <h3 className="text-lg font-semibold text-text-primary mb-6">Distribuição de Tarefas</h3>
                    <div className="space-y-4">
                        <DistributionBar label="Concluídas" count={metrics.completed} total={metrics.total} color="bg-green-500" />
                        <DistributionBar label="Em Andamento" count={filteredTasks.filter(t => t.status === 'in-progress').length} total={metrics.total} color="bg-blue-500" />
                        <DistributionBar label="Pendentes" count={filteredTasks.filter(t => t.status === 'pending').length} total={metrics.total} color="bg-text-secondary" />
                        <DistributionBar label="Canceladas" count={metrics.cancelled} total={metrics.total} color="bg-red-500" />
                        <DistributionBar label="Atrasadas" count={metrics.overdue} total={metrics.total} color="bg-orange-500" />
                    </div>
                </div>

                {/* Activity Chart (Full Width) */}
                <div className="bg-background-secondary border border-border rounded-xl p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            Tendência de Atividade
                            <div className="group relative flex items-center">
                                <Info size={16} className="text-text-secondary cursor-help" />
                                <div className="absolute left-1/2 -top-2 -translate-x-1/2 -translate-y-full w-64 bg-background-tertiary text-text-primary text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-border text-center shadow-xl">
                                    Proporção diária entre tarefas concluídas e canceladas frente ao total planejado para o dia.
                                </div>
                            </div>
                        </h3>
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-500/80"></div><span className="text-text-secondary">Concluídas</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500/50"></div><span className="text-text-secondary">Canceladas</span></div>
                        </div>
                    </div>
                    <div className="h-64 flex items-end gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {chartData.map((data, idx) => (
                            <div key={idx} className="flex-1 min-w-[30px] h-full flex flex-col justify-end gap-1 group relative">
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-background-tertiary text-text-primary text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-border">
                                    {data.label}: {data.completed} comp / {data.cancelled} canc
                                </div>

                                <div className="w-full bg-background-tertiary rounded-t-sm relative overflow-hidden" style={{ height: `${(data.total / (Math.max(...chartData.map(d => d.total)) || 1)) * 100}%` }}>
                                    <div
                                        className="absolute bottom-0 w-full bg-green-500/80 transition-all duration-500"
                                        style={{ height: `${(data.completed / (data.total || 1)) * 100}%` }}
                                    />
                                    <div
                                        className="absolute bottom-[calc(percentage(data.completed/data.total))] w-full bg-red-500/50 transition-all duration-500"
                                        style={{
                                            bottom: `${(data.completed / (data.total || 1)) * 100}%`,
                                            height: `${(data.cancelled / (data.total || 1)) * 100}%`
                                        }}
                                    />
                                </div>
                                <span className="text-[10px] text-slate-500 text-center truncate w-full">{data.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Daily Overdue Minutes Chart */}
                <div className="bg-background-secondary border border-border rounded-xl p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            <Clock className="text-red-500" size={18} />
                            Tendência de Atraso (minutos/dia)
                            <div className="group relative flex items-center">
                                <Info size={16} className="text-text-secondary cursor-help" />
                                <div className="absolute left-1/2 -top-2 -translate-x-1/2 -translate-y-full w-64 bg-background-tertiary text-text-primary text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-border text-center shadow-xl">
                                    Soma diária dos minutos extras que as tarefas levaram para serem concluídas após o término de seu horário planejado original.
                                </div>
                            </div>
                        </h3>
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500/60"></div><span className="text-text-secondary">Minutos Adicionais / Atrasos</span></div>
                        </div>
                    </div>
                    <div className="h-64 flex items-end gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {chartData.map((data: any, idx) => (
                            <div key={idx} className="flex-1 min-w-[30px] h-full flex flex-col justify-end gap-1 group relative">
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-background-tertiary text-text-primary text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-border">
                                    {data.label}: {data.overdueMinutes}m atraso
                                </div>
                                <div
                                    className="w-full bg-red-500/60 rounded-t-sm hover:bg-red-500 transition-all duration-300"
                                    style={{
                                        height: `${(data.overdueMinutes / (Math.max(...chartData.map((d: any) => d.overdueMinutes)) || 1)) * 100}%`,
                                        minHeight: data.overdueMinutes > 0 ? '4px' : '0'
                                    }}
                                />
                                <span className="text-[10px] text-slate-500 text-center truncate w-full">{data.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Daily Pushed Minutes Chart */}
                <div className="bg-background-secondary border border-border rounded-xl p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            <Calendar className="text-orange-500" size={18} />
                            Impacto na Agenda (minutos)
                            <div className="group relative flex items-center">
                                <Info size={16} className="text-text-secondary cursor-help" />
                                <div className="absolute left-1/2 -top-2 -translate-x-1/2 -translate-y-full w-72 bg-background-tertiary text-text-primary text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-border text-center shadow-xl">
                                    Total de minutos diários em que tarefas subsequentes foram "empurradas" para frente devido a atrasos e extensões de tarefas anteriores.
                                </div>
                            </div>
                        </h3>
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-orange-500/60"></div><span className="text-text-secondary">Minutos Empurrados (Efeito Cascata)</span></div>
                        </div>
                    </div>
                    <div className="h-64 flex items-end gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {chartData.map((data: any, idx) => (
                            <div key={idx} className="flex-1 min-w-[30px] h-full flex flex-col justify-end gap-1 group relative">
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-background-tertiary text-text-primary text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-border">
                                    {data.label}: {data.pushedMinutes}m empurrados
                                </div>
                                <div
                                    className="w-full bg-orange-500/60 rounded-t-sm hover:bg-orange-500 transition-all duration-300"
                                    style={{
                                        height: `${(Number(data.pushedMinutes) / (Math.max(...chartData.map((d: any) => Number(d.pushedMinutes) || 0)) || 1)) * 100}%`,
                                        minHeight: Number(data.pushedMinutes) > 0 ? '4px' : '0'
                                    }}
                                />
                                <span className="text-[10px] text-slate-500 text-center truncate w-full">{data.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, subtitle, icon, color, trend }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-background-secondary/50 border border-border p-4 rounded-xl hover:bg-background-secondary transition-colors"
    >
        <div className="flex justify-between items-start mb-2">
            <span className="text-text-secondary text-sm font-medium">{title}</span>
            <div className={`p-2 rounded-lg bg-${color}-500/10`}>
                {icon}
            </div>
        </div>
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        {subtitle && <div className="text-xs text-text-secondary mt-1">{subtitle}</div>}
        {trend && <div className="text-xs text-green-400 mt-1 flex items-center gap-1">↑ {trend}</div>}
    </motion.div>
);

const DistributionBar = ({ label, count, total, color }: any) => (
    <div>
        <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">{label}</span>
            <span className="text-text-secondary">{count} ({total > 0 ? Math.round((count / total) * 100) : 0}%)</span>
        </div>
        <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                className={`h-full ${color}`}
            />
        </div>
    </div>
);
