import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { isSameDay } from 'date-fns';
import { AlertCircle, BrainCircuit, Settings2, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Opções de horas disponíveis para seleção
const HOUR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

interface SelectProps {
    value: number;
    options: number[];
    onChange: (val: number) => void;
    id: string;
}

const HourSelect: React.FC<SelectProps> = ({ value, options, onChange, id }) => (
    <div className="relative">
        <select
            id={id}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            aria-label="Selecionar horas"
            className="appearance-none w-full bg-background-tertiary border border-border rounded-lg px-3 py-1.5 pr-7 text-sm font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
            {options.map(h => (
                <option key={h} value={h}>{h}h</option>
            ))}
        </select>
        <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
    </div>
);

export const CognitiveLoadGauge: React.FC = () => {
    const { tasks, selectedDate } = useTaskStore();
    const {
        cognitiveLoadMeta,
        cognitiveLoadLimit,
        setCognitiveLoadMeta,
        setCognitiveLoadLimit,
    } = useSettingsStore();

    const [showConfig, setShowConfig] = useState(false);
    const [draftMeta, setDraftMeta] = useState(cognitiveLoadMeta);
    const [draftLimit, setDraftLimit] = useState(cognitiveLoadLimit);
    const panelRef = useRef<HTMLDivElement>(null);

    // Sync drafts when store values change externally
    useEffect(() => {
        setDraftMeta(cognitiveLoadMeta);
        setDraftLimit(cognitiveLoadLimit);
    }, [cognitiveLoadMeta, cognitiveLoadLimit]);

    // Close on outside click
    useEffect(() => {
        if (!showConfig) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setShowConfig(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showConfig]);

    const handleSave = () => {
        setCognitiveLoadMeta(draftMeta);
        setCognitiveLoadLimit(draftLimit);
        setShowConfig(false);
    };

    const stats = useMemo(() => {
        const todaysTasks = tasks.filter(t =>
            isSameDay(t.startTime, selectedDate) && t.status !== 'cancelled'
        );

        const totalMinutes = todaysTasks.reduce((acc, t) => acc + t.durationMinutes, 0);
        const totalHours = totalMinutes / 60;

        // Progress based on configured limit
        const progress = Math.min(100, (totalHours / cognitiveLoadLimit) * 100);

        let colorClass = 'bg-green-500';
        let statusText = 'Carga Leve';

        if (totalHours > cognitiveLoadMeta) {
            colorClass = 'bg-red-600';
            statusText = 'Carga Crítica';
        } else if (totalHours > cognitiveLoadMeta * 0.625) {
            // ~62.5% of meta = "moderada" threshold (was 5/8)
            colorClass = 'bg-yellow-500';
            statusText = 'Carga Moderada';
        }

        return { totalHours, progress, colorClass, statusText };
    }, [tasks, selectedDate, cognitiveLoadMeta, cognitiveLoadLimit]);

    const isOverloaded = stats.totalHours > cognitiveLoadMeta;

    const metaWarning = draftMeta > 8;
    const limitWarning = draftLimit > 12;

    return (
        <div className="w-full space-y-4 mb-6">
            <div id="cognitive-load-gauge" className="bg-background-secondary/40 border border-border rounded-2xl p-4 backdrop-blur-sm transition-all">
                {/* Header */}
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${stats.colorClass} bg-opacity-10`}>
                            <BrainCircuit size={18} className={stats.colorClass.replace('bg-', 'text-')} />
                        </div>
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-text-secondary">Carga Cognitiva</h3>
                            <p className="text-[10px] font-bold text-text-tertiary">{stats.statusText}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-right">
                            <span className="text-xl font-black text-text-primary">{stats.totalHours.toFixed(1)}h</span>
                            <span className="text-[10px] font-bold text-text-tertiary ml-1">alocadas</span>
                        </div>
                        {/* Config icon */}
                        <button
                            title="Configurar carga cognitiva"
                            onClick={() => setShowConfig(v => !v)}
                            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-background-tertiary transition-colors"
                        >
                            <Settings2 size={15} />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 bg-background-tertiary rounded-full overflow-hidden p-0.5 border border-border">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.progress}%` }}
                        className={`h-full rounded-full ${stats.colorClass} shadow-lg transition-all duration-500`}
                        style={{ boxShadow: `0 0 10px ${isOverloaded ? 'rgba(220, 38, 38, 0.4)' : 'transparent'}` }}
                    />
                </div>

                {/* Labels */}
                <div className="flex justify-between mt-2 text-[9px] font-bold text-text-tertiary uppercase tracking-tighter">
                    <span>Início</span>
                    <span>Meta: {cognitiveLoadMeta}h</span>
                    <span>Limite: {cognitiveLoadLimit}h</span>
                </div>

                {/* Config Panel */}
                <AnimatePresence>
                    {showConfig && (
                        <motion.div
                            ref={panelRef}
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-background-tertiary/60 border border-border rounded-xl p-3 space-y-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Configurar</span>
                                    <button onClick={() => setShowConfig(false)} title="Fechar" className="text-text-tertiary hover:text-text-secondary transition-colors">
                                        <X size={13} />
                                    </button>
                                </div>

                                {/* Meta */}
                                <div className="space-y-1">
                                    <label htmlFor="cog-meta" className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Meta diária</label>
                                    <HourSelect
                                        id="cog-meta"
                                        value={draftMeta}
                                        options={HOUR_OPTIONS}
                                        onChange={setDraftMeta}
                                    />
                                    <AnimatePresence>
                                        {metaWarning && (
                                            <motion.p
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                className="text-[10px] text-yellow-400/80 leading-snug"
                                            >
                                                ⚠ Você está configurando uma meta acima de 8 horas. Busque concentrar seu foco dentro do seu período de trabalho.
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Limite */}
                                <div className="space-y-1">
                                    <label htmlFor="cog-limit" className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Limite diário</label>
                                    <HourSelect
                                        id="cog-limit"
                                        value={draftLimit}
                                        options={HOUR_OPTIONS}
                                        onChange={setDraftLimit}
                                    />
                                    <AnimatePresence>
                                        {limitWarning && (
                                            <motion.p
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                className="text-[10px] text-orange-400/80 leading-snug"
                                            >
                                                ⚠ Lembre-se que você precisa descansar. Trabalhar horas excessivas sem planejamento pode levar à exaustão.
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <button
                                    onClick={handleSave}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
                                >
                                    Salvar
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Overload alert */}
            <AnimatePresence>
                {isOverloaded && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex gap-3 items-start animate-pulse-slow"
                    >
                        <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                        <p className="text-xs text-red-200/80 leading-relaxed font-medium">
                            <strong className="text-red-400 block mb-1 uppercase tracking-wider text-[10px]">Alerta de Realismo</strong>
                            Atenção: Já planeaste mais de {cognitiveLoadMeta}h para hoje. Recomenda-se replanear alguns blocos para manter a tua energia e foco realistas.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
