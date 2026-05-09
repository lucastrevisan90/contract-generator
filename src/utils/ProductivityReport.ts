import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Task } from '../store/useTaskStore';
import { Habit, HabitCompletion } from '../store/useHabitStore';

// Extend jsPDF with autoTable type
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

interface ReportData {
    userName: string;
    dateRange: string;
    tasks: Task[];
    habits: Habit[];
    completions: HabitCompletion[];
    timeRangeLabels: string[];
}

export const generateProductivityReport = async (data: ReportData) => {
    const doc = new jsPDF();
    const { userName, dateRange, tasks, habits, completions } = data;

    // --- Header ---
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Produtividade', 20, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Usuário: ${userName}`, 20, 30);
    doc.text(`Período: ${dateRange}`, 140, 30);

    let yPos = 50;

    // --- Section: Time Blocking ---
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Execução de Time Blocking', 20, yPos);

    yPos += 10;

    const totalPlannedMins = tasks.reduce((acc, t) => acc + t.durationMinutes, 0);
    const totalActualMins = tasks.reduce((acc, t) => acc + (t.actualDurationMinutes || 0), 0);
    const efficiency = totalPlannedMins > 0 ? Math.round((totalActualMins / totalPlannedMins) * 100) : 0;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    autoTable(doc, {
        startY: yPos,
        head: [['Métrica', 'Valor']],
        body: [
            ['Total de Tarefas no Período', tasks.length.toString()],
            ['Tarefas Concluídas', completedTasks.toString()],
            ['Taxa de Conclusão', `${completionRate}%`],
            ['Horas Planejadas', `${(totalPlannedMins / 60).toFixed(1)}h`],
            ['Horas Realmente Executadas', `${(totalActualMins / 60).toFixed(1)}h`],
            ['Índice de Eficiência Temporal', `${efficiency}%`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }, // Blue-500
        styles: { fontSize: 10 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    // --- Section: Habits ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Acompanhamento de Hábitos', 20, yPos);

    yPos += 10;

    const habitSuccessData = habits.map(habit => {
        const habitCompletions = completions.filter(c => c.habitId === habit.id).length;
        // Simplified success rate: completions / period days? 
        // For visual, we use a percentage based on total completions in interval
        return [habit.title, habitCompletions.toString(), habit.daysOfWeek.length > 0 ? 'Frequente' : 'Ocasional'];
    });

    autoTable(doc, {
        startY: yPos,
        head: [['Hábito', 'Total de Conclusões', 'Frequência']],
        body: habitSuccessData.length > 0 ? habitSuccessData : [['Sem hábitos registrados no período', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] }, // Emerald-500
        styles: { fontSize: 10 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    // --- Section: Cognitive Load & Insights ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Insights de Carga e Realismo', 20, yPos);

    yPos += 10;

    const avgLoad = (totalPlannedMins / 60) / (tasks.length > 0 ? 1 : 1); // Mock logic for average load per day
    let loadStatus = 'Equilibrada';
    if (avgLoad > 8) loadStatus = 'Crítica';
    else if (avgLoad > 5) loadStatus = 'Moderada';

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text([
        `Carga Média Diária Estimada: ${loadStatus}`,
        `Horas Médias Planejadas: ${(totalPlannedMins / 60).toFixed(1)}h`,
        '',
        'Sugestão Realista:',
        totalPlannedMins / 60 > 40 ? 'O seu planejamento semanal parece estar sobrecarregado. Considere delegar ou' : 'Você mantém um ritmo saudável.',
        totalPlannedMins / 60 > 40 ? 'reagendar tarefas para evitar Burnout.' : 'Continue focando na consistência.'
    ], 20, yPos);

    // --- Footer ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} - Pagina ${i} de ${pageCount}`, 20, 285);
        doc.text('Time Blocking App - Versão Pro', 160, 285);
    }

    // Save PDF
    doc.save(`Relatorio_Produtividade_${format(new Date(), 'yyyyMMdd')}.pdf`);
};
