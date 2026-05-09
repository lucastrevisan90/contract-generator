import React from 'react';
import { motion } from 'framer-motion';
import { useHabitStore } from '../../store/useHabitStore';

interface VitalityMeterProps {
    compact?: boolean;
}

export const VitalityMeter: React.FC<VitalityMeterProps> = ({ compact = false }) => {
    const { vitality } = useHabitStore();

    const getMoodEmoji = (v: number) => {
        if (v >= 80) return '🤩';
        if (v >= 40) return '😐';
        return '😞';
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background-tertiary rounded-lg border border-border">
                <span className="text-xl leading-none">{getMoodEmoji(vitality)}</span>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-tighter leading-none mb-1">Vitalidade</span>
                    <div className="w-16 h-1.5 bg-background-primary rounded-full overflow-hidden border border-border/50">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${vitality}%` }}
                            className={`h-full rounded-full ${vitality >= 80 ? 'bg-green-500' : vitality >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <span className="text-2xl">{getMoodEmoji(vitality)}</span>
            <div className="flex flex-col min-w-[100px]">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Energia</span>
                    <span className="text-[10px] font-bold text-accent">{vitality}%</span>
                </div>
                <div className="h-2 bg-background-tertiary rounded-full overflow-hidden border border-border">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${vitality}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${vitality >= 80 ? 'bg-green-500' : vitality >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                    />
                </div>
            </div>
        </div>
    );
};
