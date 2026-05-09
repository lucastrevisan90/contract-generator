import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DayView } from './components/Calendar/DayView'
import { MonthView } from './components/Calendar/MonthView'
import { TimerBar } from './components/ActiveTask/TimerBar'
import { startSyncEngine, SYNC_EVENTS } from './lib/sync';
import { RescheduleModal } from './components/Modals/RescheduleModal'
import { ConfirmCompleteModal } from './components/Modals/ConfirmCompleteModal'
import { TaskDetailsModal } from './components/Modals/TaskDetailsModal'
import { AdvanceTaskModal } from './components/Modals/AdvanceTaskModal'
import { ConfirmCancelModal } from './components/Modals/ConfirmCancelModal'
import { EditTaskModal } from './components/Modals/EditTaskModal';
import { RecurrenceSuccessModal } from './components/Modals/RecurrenceSuccessModal';
import { StartConflictModal } from './components/Modals/StartConflictModal';
import { StatsView } from './components/Dashboard/StatsView'
import { HabitTrackerView } from './components/Habits/HabitTrackerView'
import { AdminView } from './components/Dashboard/AdminView'
import { FocusStatusBar } from './components/ActiveTask/FocusStatusBar'
import { useTaskStore } from './store/useTaskStore'
import { useAuthStore } from './store/useAuthStore'
import { useHabitStore } from './store/useHabitStore'
import { useSettingsStore } from './store/useSettingsStore'
import { DocumentationModal } from './components/Modals/DocumentationModal'
import { SupportModal } from './components/Modals/SupportModal'
import { useSoundAlerts } from './hooks/useSoundAlerts'
import { addMinutes, isSameDay } from 'date-fns'
import { TutorialTour } from './components/Common/TutorialTour'

import { SettingsModal } from './components/Modals/SettingsModal'
import { LoginView } from './components/Auth/LoginView'
import { SyncIndicator } from './components/Common/SyncIndicator'
import { ModalQueueManager } from './components/Common/ModalQueueManager'
import { HelpCircle, Settings, ShieldAlert, LogOut, BookOpen, Mail, PlayCircle } from 'lucide-react'
import { DesktopSidebar } from './components/Navigation/DesktopSidebar';
import { MobileTabBar } from './components/Navigation/MobileTabBar';
import { PomodoroTimer } from './components/Pomodoro/PomodoroTimer';

function App() {
    useSoundAlerts();
    const {
        tasks,
        activeTaskId,
        viewingTaskId,
        setViewingTaskId,
        showAdvanceModal,
        advanceTaskId,
        hideAdvanceModal,
        advanceTask,
        hideCancelConfirmation,
        cancelTask,
        showConfirmCancel,
        cancelTaskId,
        showConfirmComplete,
        completeTaskId,
        hideCompleteConfirmation,
        showRescheduleModal,
        rescheduleTaskId,
        closeRescheduleModal,
        showRecurrenceSuccess,
        hideRecurrenceSuccess,
        completeTask,
        checkOverlaps,
        enqueueModal,
        isFocusMode
    } = useTaskStore();

    const [viewModeState, setViewModeState] = useState<'day' | 'month' | 'stats' | 'habits' | 'admin'>('day');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const viewMode = viewModeState;

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (event.state && event.state.viewMode) {
                setViewModeState(event.state.viewMode);
            } else {
                setViewModeState('day');
            }
        };
        window.addEventListener('popstate', handlePopState);
        if (!window.history.state || !window.history.state.viewMode) {
            window.history.replaceState({ viewMode: 'day' }, '', '?view=day');
        }
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const setViewMode = (mode: 'day' | 'month' | 'stats' | 'habits' | 'admin') => {
        setViewModeState(mode);
        window.history.pushState({ viewMode: mode }, '', `?view=${mode}`);
    };
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editTask, setEditTask] = useState<any>(null);
    const [runTutorial, setRunTutorial] = useState(false);

    // Help Center States
    const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

    const { user, profile, loading: authLoading, isRecoveryMode, initialize, signOut } = useAuthStore();
    const { theme, hasCompletedTutorial, setHasCompletedTutorial } = useSettingsStore();

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => {
        if (user && profile) {
            // Garante sincronia do banco com o estado local para evitar piscar na tela
            if (profile.has_completed_tutorial === true && !hasCompletedTutorial) {
                setHasCompletedTutorial(true);
            }

            // Dispara o tutorial apenas se o status no DB for estritamente 'false' e local também for falso
            // AND the profile is fully loaded AND password is not required.
            // Using a timeout or checking if we're not in the middle of auth loading helps stabilize this.
            if (profile.has_completed_tutorial === false && hasCompletedTutorial === false && !profile.password_change_required) {
                // Verify it genuinely hasn't been completed in this session
                setRunTutorial(true);
            }
        }
    }, [user, profile, hasCompletedTutorial, setHasCompletedTutorial]);

    useEffect(() => {
        if (user && !(window as any).__SYNC_ENGINE_STARTED__) {
            startSyncEngine();
            (window as any).__SYNC_ENGINE_STARTED__ = true;
        }

        // Global Sync Listener to refresh UI when pull completes (manual or on-line)
        const handlePullCompleted = async () => {
            console.log('[App] 🔄 Sync PULL_COMPLETED event received. Refreshing UI stores...');
            try {
                // Ensure we await these to know when refresh is actually done in logs
                await Promise.all([
                    useTaskStore.getState().fetchTasks(),
                    useHabitStore.getState().fetchHabits(),
                    useSettingsStore.getState().fetchSettings()
                ]);

                // V9.13: Auto-cleanup Modal Queue based on new task statuses
                const currentTasks = useTaskStore.getState().tasks;
                const modalQueue = useTaskStore.getState().modalQueue;
                
                if (modalQueue.length > 0) {
                    modalQueue.forEach(modal => {
                        const task = currentTasks.find(t => t.id === modal.taskId);
                        // Se a tarefa não é mais pending, o modal de início/atraso não faz mais sentido
                        if (task && task.status !== 'pending' && (modal.type === 'start' || modal.type === 'overdue-resolution')) {
                            console.log(`[App] 🛡️ Auto-resolvendo modal redundante: ${modal.type} para tarefa ${task.title} (${task.status})`);
                            // Remove o modal específico da fila
                            useTaskStore.setState(state => ({
                                modalQueue: state.modalQueue.filter(m => m.id !== modal.id)
                            }));
                        }
                    });
                }
                console.log('[App] ✅ UI Stores refreshed successfully.');
            } catch (err) {
                console.error('[App] Store refresh error:', err);
            }
        };

        window.addEventListener(SYNC_EVENTS.PULL_COMPLETED as any, handlePullCompleted);
        return () => window.removeEventListener(SYNC_EVENTS.PULL_COMPLETED as any, handlePullCompleted);
    }, [user]);

    // 0. Persistence Request
    useEffect(() => {
        if (navigator.storage && navigator.storage.persist) {
            navigator.storage.persist().then(granted => {
                if (granted) {
                    console.log("Storage will not be cleared except by explicit user action");
                } else {
                    console.log("Storage may be cleared by the UA under storage pressure.");
                }
            });
        }
    }, []);

    // 1. Mount Backlog Check
    useEffect(() => {
        if (tasks.length === 0) return;

        const now = new Date();
        const backlogged = tasks.filter(t => {
            if (t.status !== 'pending' && t.status !== 'in-progress' && t.status !== 'paused') return false;

            // Allow checking tasks from ANY previous day (removing isSameDay check)
            const startTime = new Date(t.startTime);
            const endTime = addMinutes(startTime, t.durationMinutes);

            // Logic:
            // 1. Pending: If StartTime passed.
            // 2. In-Progress: If EndTime passed (stale running).
            // 3. Paused: If EndTime passed (stale paused).

            if (t.status === 'pending' && now > startTime) return true;
            if (t.status === 'in-progress' && now > endTime) return true;
            if (t.status === 'paused' && now > endTime) return true;

            return false;
        }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        backlogged.forEach(t => {
            const startTime = new Date(t.startTime);
            const endTime = addMinutes(startTime, t.durationMinutes);

            // If the task is running/paused but past its end time, it's a "zombie" task.
            // We should auto-pause it so it doesn't look like it's running, then ask for resolution.
            if ((t.status === 'in-progress' || t.status === 'paused') && now > endTime) {
                console.log('[App] Auto-resolving zombie task:', t.id);
                useTaskStore.getState().handleOverdue(t.id);
                enqueueModal('overdue-resolution', t.id);
            }
            else if (t.status === 'pending') {
                // If the ENTIRE slot is missed (Now > EndTime), it's Overdue Resolution
                if (now > endTime) {
                    useTaskStore.getState().handleOverdue(t.id);
                    enqueueModal('overdue-resolution', t.id);
                } else {
                    // If just the start passed but window is open, prompts Start
                    enqueueModal('start', t.id);
                }
            }
        });
    }, [tasks.length > 0, enqueueModal]);

    // 2. Monitoring Effect
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();

            // Check for new exact starts
            // Check for new exact starts
            // REMOVED BLOCKING CHECK: if (!runningTask) to allow concurrent start alerts
            const startTrigger = tasks.find(t => {
                if (t.status !== 'pending') return false;
                const startTime = new Date(t.startTime);
                const diffMs = startTime.getTime() - now.getTime();
                return isSameDay(startTime, now) && diffMs <= 0 && diffMs > -60000;
            });
            if (startTrigger) enqueueModal('start', startTrigger.id);

            // Check for new expired ends
            const overdueTrigger = tasks.find(t => {
                if (t.status !== 'in-progress' && t.status !== 'pending') return false;
                const startTime = new Date(t.startTime);
                const endTime = addMinutes(startTime, t.durationMinutes);
                return isSameDay(startTime, now) && now > addMinutes(endTime, 1);
            });
            if (overdueTrigger) {
                console.log('[App] Overdue trigger detected:', overdueTrigger.id);
                useTaskStore.getState().handleOverdue(overdueTrigger.id);
                enqueueModal('overdue-resolution', overdueTrigger.id);
            }

            // Check for Time Up
            const activeTask = tasks.find(t => t.id === activeTaskId);
            if (activeTask && activeTask.status === 'in-progress') {
                const startTime = new Date(activeTask.startTime);
                const endTime = addMinutes(startTime, activeTask.durationMinutes);
                if (now >= endTime) enqueueModal('time-up', activeTask.id);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [tasks, activeTaskId, enqueueModal]);

    // 3. Overlap Logic
    useEffect(() => {
        const interval = setInterval(() => {
            checkOverlaps();
        }, 15000);
        return () => clearInterval(interval);
    }, [checkOverlaps]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Carregando...</p>
                </div>
            </div>
        );
    }

    const isUrlRecovery = window.location.hash.includes('type=recovery');

    if (!user || profile?.password_change_required || isRecoveryMode || isUrlRecovery) {
        return <LoginView />;
    }

    const advanceTaskForModal = tasks.find(t => t.id === advanceTaskId);
    const cancelTaskForModal = tasks.find(t => t.id === cancelTaskId);
    const isInactive = profile?.subscription_status === 'inactive';
    const isMaster = profile?.is_admin || user?.email === 'master@oitoh.com.br' || user?.email === 'oitoh@oitoh.com.br' || user?.email?.includes('master') || user?.email?.includes('oitoh') || user?.email?.includes('admin') || user?.email?.includes('lucas') || false;

    if (isInactive) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-12 rounded-[32px] shadow-2xl animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-amber-500/20">
                        <ShieldAlert className="text-amber-500" size={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Assinatura Necessária</h2>
                    <p className="text-slate-400 leading-relaxed mb-8">
                        Sua conta está atualmente <strong>inativa</strong>. Para continuar utilizando as ferramentas de produtividade, entre em contato com o administrador ou realize o upgrade do seu plano.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => alert('Em breve: Página de Upgrade')}
                            className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-amber-600/20 uppercase tracking-widest text-xs"
                        >
                            Ver Opções de Plano
                        </button>
                        <button
                            onClick={signOut}
                            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                        >
                            <LogOut size={16} />
                            Sair da Conta
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-background-primary text-text-primary h-screen w-full relative transition-colors duration-300 overflow-hidden">
            {/* Focus Overlay */}
            <AnimatePresence>
                {isFocusMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
                    />
                )}
            </AnimatePresence>

            {!isMobile && (
                <DesktopSidebar
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    isAdmin={isMaster}
                    setIsSettingsOpen={setIsSettingsOpen}
                    setIsHelpMenuOpen={setIsHelpMenuOpen}
                    isHelpMenuOpen={isHelpMenuOpen}
                    signOut={signOut}
                    setRunTutorial={setRunTutorial}
                    setIsDocModalOpen={setIsDocModalOpen}
                    setIsSupportModalOpen={setIsSupportModalOpen}
                />
            )}

            {/* Background Content (Blurred when Focused) */}
            <div className={`flex flex-col flex-1 h-screen transition-all duration-700 ease-in-out ${isFocusMode ? 'blur-xl scale-[0.99] opacity-70 grayscale-[0.2] pointer-events-none' : ''}`}>
                <header className="w-full bg-background-secondary/50 border-b border-border px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 z-40">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <img src="/logo-8.png" alt="OitoH Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        <div>
                            <h1 className="text-lg sm:text-xl font-normal text-text-primary tracking-tight leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>Oito<span className="font-bold">H</span></h1>
                            <div className="hidden sm:flex items-center gap-1.5 opacity-80 mt-0.5">
                                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse outline outline-2 outline-green-500/20" />
                                <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest">{profile?.full_name || user?.email}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-6 order-3 sm:order-none w-full sm:w-auto justify-between sm:justify-end">
                        <SyncIndicator />
                        {isMobile && (
                            <div className="flex items-center gap-1 sm:gap-2">
                                {/* Help Menu Dropdown */}
                                <div className="relative">
                                    <button
                                        id="help-button"
                                        onClick={() => setIsHelpMenuOpen(!isHelpMenuOpen)}
                                        className={`p-2 sm:p-2.5 rounded-xl transition-all border ${isHelpMenuOpen
                                            ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400 font-bold'
                                            : 'bg-background-tertiary/50 text-text-secondary hover:text-indigo-400 hover:bg-background-tertiary border-border'
                                            }`}
                                        title="Centro de Ajuda"
                                    >
                                        <HelpCircle size={18} />
                                    </button>

                                    {isHelpMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsHelpMenuOpen(false)} />
                                            <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                                                <div className="px-4 py-2 border-b border-slate-800/50 mb-1">
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Centro de Ajuda</p>
                                                </div>
                                                <button
                                                    onClick={() => { setRunTutorial(true); setIsHelpMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-800 text-slate-300 hover:text-white text-sm flex items-center gap-3 transition-colors"
                                                >
                                                    <PlayCircle size={16} className="text-indigo-400" />
                                                    Ver Tutorial (Tour)
                                                </button>
                                                <button
                                                    onClick={() => { setIsDocModalOpen(true); setIsHelpMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-800 text-slate-300 hover:text-white text-sm flex items-center gap-3 transition-colors"
                                                >
                                                    <BookOpen size={16} className="text-emerald-400" />
                                                    Documentação & FAQ
                                                </button>
                                                <button
                                                    onClick={() => { setIsSupportModalOpen(true); setIsHelpMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-800 text-slate-300 hover:text-white text-sm flex items-center gap-3 transition-colors"
                                                >
                                                    <Mail size={16} className="text-blue-400" />
                                                    Suporte Técnico
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <button id="settings-button" onClick={() => setIsSettingsOpen(true)} className="p-2 sm:p-2.5 bg-background-tertiary/50 text-text-secondary hover:text-text-primary hover:bg-background-tertiary rounded-xl transition-all border border-border" title="Configurações"><Settings size={18} /></button>

                                {isMobile && (
                                    <button onClick={signOut} className="p-2 sm:p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all border border-red-500/20" title="Sair"><LogOut size={18} /></button>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                <main className={`flex-1 overflow-auto p-4 transition-all duration-500 relative ${isMobile ? 'pb-24' : ''}`}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={viewMode}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className={`max-w-[1400px] w-full mx-auto h-full ${isInactive ? 'pointer-events-none opacity-40 grayscale-[0.5]' : ''}`}
                        >
                            {viewMode === 'day' && <DayView />}
                            {viewMode === 'month' && <MonthView onSelectDate={() => setViewMode('day')} />}
                            {viewMode === 'stats' && <StatsView />}
                            {viewMode === 'habits' && <HabitTrackerView />}
                            {viewMode === 'admin' && <AdminView />}
                        </motion.div>
                    </AnimatePresence>
                </main>

                <TimerBar />

                {isMobile && <MobileTabBar viewMode={viewMode} setViewMode={setViewMode} isAdmin={isMaster} />}
            </div>

            <FocusStatusBar />

            <ModalQueueManager />

            {/* Modals remain in front of the blurred background, but behind FocusStatusBar if and only if they coexist */}
            {completeTaskId && (
                <ConfirmCompleteModal
                    isOpen={showConfirmComplete}
                    onClose={hideCompleteConfirmation}
                    onConfirm={() => completeTask(completeTaskId)}
                    taskTitle={tasks.find(t => t.id === completeTaskId)?.title || ''}
                />
            )}

            {rescheduleTaskId && (
                <RescheduleModal
                    isOpen={showRescheduleModal}
                    onClose={closeRescheduleModal}
                    taskId={rescheduleTaskId}
                />
            )}

            <AdvanceTaskModal
                isOpen={showAdvanceModal}
                onClose={hideAdvanceModal}
                onConfirm={() => advanceTask(advanceTaskId || '')}
                taskTitle={advanceTaskForModal?.title || ''}
                scheduledTime={new Date(advanceTaskForModal?.startTime || new Date())}
            />

            <ConfirmCancelModal
                isOpen={showConfirmCancel}
                onClose={hideCancelConfirmation}
                onConfirm={(subsequent) => cancelTask(cancelTaskId || '', { cancelSeriesSubsequent: subsequent })}
                taskTitle={cancelTaskForModal?.title || ''}
                isRecurring={!!cancelTaskForModal?.occurrence?.seriesId}
            />

            <RecurrenceSuccessModal isOpen={showRecurrenceSuccess} onClose={hideRecurrenceSuccess} />
            <StartConflictModal />

            <TaskDetailsModal
                isOpen={!!viewingTaskId}
                onClose={() => setViewingTaskId(null)}
                onEdit={() => {
                    const task = tasks.find(t => t.id === viewingTaskId);
                    if (task) {
                        setEditTask(task);
                        setIsEditModalOpen(true);
                        setViewingTaskId(null);
                    }
                }}
                taskId={viewingTaskId || ''}
            />

            {editTask && (
                <EditTaskModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditTask(null);
                    }}
                    task={editTask}
                />
            )}

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            <DocumentationModal isOpen={isDocModalOpen} onClose={() => setIsDocModalOpen(false)} />
            <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />

            <TutorialTour run={runTutorial} setRun={setRunTutorial} />

            {/* Pomodoro Timer (Global Independent Tool) */}
            <PomodoroTimer />
        </div>
    );
}

export default App;
