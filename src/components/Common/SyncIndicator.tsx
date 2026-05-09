import React, { useState, useEffect } from 'react';
import { RefreshCcw, Wifi, WifiOff } from 'lucide-react';
import { syncAll } from '../../lib/sync';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskStore } from '../../store/useTaskStore';
import { useHabitStore } from '../../store/useHabitStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';

export const SyncIndicator: React.FC = () => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showTooltip, setShowTooltip] = useState(false);

    // Number of pending local changes
    const pendingCount = useLiveQuery(
        () => db.sync_operations.where('synced').equals(0).count()
    ) ?? 0;

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleSync = async () => {
        if (!isOnline) return;
        if (isSyncing) return;

        setIsSyncing(true);
        try {
            await syncAll();
            // Refresh stores to show new data pulled from server
            await Promise.all([
                useTaskStore.getState().fetchTasks(),
                useHabitStore.getState().fetchHabits(),
                useSettingsStore.getState().fetchSettings()
            ]);
        } catch (error) {
            console.error('Manual sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="relative flex items-center">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSync}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className={`
                    relative p-2 rounded-xl transition-all duration-300
                    flex items-center justify-center gap-2
                    ${isOnline 
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/10 grayscale cursor-not-allowed'}
                `}
                disabled={!isOnline || isSyncing}
            >
                <div className="relative">
                    <motion.div
                        animate={isSyncing ? { rotate: 360 } : { rotate: 0 }}
                        transition={isSyncing ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0.2 }}
                    >
                        <RefreshCcw size={16} />
                    </motion.div>
                    {pendingCount > 0 && !isSyncing && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    )}
                </div>
                
                <div className={`flex flex-col items-start leading-none ${isMobile ? 'hidden' : 'block'}`}>
                    <span className="text-[9px] font-bold uppercase tracking-widest">
                        {isSyncing ? 'Sincronizando' : (pendingCount > 0 ? 'Sincronizar' : (isOnline ? 'Sincronizado' : 'Offline'))}
                    </span>
                    {pendingCount > 0 && (
                        <span className="text-[7px] text-amber-500 font-bold">{pendingCount} pendentes</span>
                    )}
                </div>

                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-500'}`} />
            </motion.button>

            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full mt-2 right-0 whitespace-nowrap bg-slate-900/95 backdrop-blur-md border border-white/10 p-2.5 rounded-xl shadow-2xl text-[10px] text-white z-50 pointer-events-none"
                    >
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                {isOnline ? <Wifi size={12} className="text-emerald-400" /> : <WifiOff size={12} className="text-slate-400" />}
                                <span className="font-bold">{isOnline ? 'Conectado ao Cloud' : 'Desconectado'}</span>
                            </div>
                            <p className="text-slate-400 text-[9px]">
                                {isOnline 
                                    ? (pendingCount > 0 ? `Você tem ${pendingCount} alterações locais.` : 'Seus dados estão em harmonia.')
                                    : 'As alterações serão sincronizadas ao voltar online.'}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Simple hook to detect mobile in this component context if needed, 
// though we usually use Tailwind's hidden sm:block
const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
