import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addMinutes, isSameDay } from 'date-fns';
import { db, logSyncOperation, LocalTask } from '../lib/db';
import { pullRemoteChanges } from '../lib/sync';
import { supabase } from '../lib/supabase';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'overdue' | 'cancelled' | 'paused';

export interface Task {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  durationMinutes: number;
  status: TaskStatus;
  actualDurationMinutes?: number;
  completedAt?: Date;
  actualEndAt?: string;
  rescheduleCount?: number;
  postponedCount?: number;
  overdueStartedAt?: string;
  overdueMinutes?: number;
  extensionsCount?: number;
  extendedMinutesTotal?: number;
  pushedMinutesCaused?: number;
  originalPlannedStartAt?: string;
  originalPlannedEndAt?: string;
  overflowToNextDayCandidate?: boolean;
  pausedAt?: string;
  totalPausedMs?: number;
  completedWithDelay?: boolean;
  recurrence?: {
    seriesId: string;
    ruleType: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
    interval?: number;
    daysOfWeek?: number[];
    customDates?: string[];
    createdAt: string;
  };
  occurrence?: {
    seriesId: string;
    occurrenceDate: string;
    isSeriesMaster?: boolean;
  };
  allowOverlap?: boolean;
  userId: string;
}

export type ModalType = 'start' | 'time-up' | 'overdue-resolution' | 'overlap';

export interface ModalQueueItem {
  id: string;
  type: ModalType;
  taskId: string;
  timestamp: number;
}

interface TaskStore {
  tasks: Task[];
  activeTaskId: string | null;
  viewingTaskId: string | null;
  selectedDate: Date;
  showAdvanceModal: boolean;
  advanceTaskId: string | null;
  showConfirmCancel: boolean;
  cancelTaskId: string | null;
  showRescheduleModal: boolean;
  rescheduleTaskId: string | null;
  showConfirmComplete: boolean;
  completeTaskId: string | null;
  showRecurrenceSuccess: boolean;
  recurrenceHorizon: number;
  isLoading: boolean;
  userId: string | null;
  showOverlapModal: boolean;
  overlapData: { activeTaskId: string, nextTaskId: string } | null;
  modalQueue: ModalQueueItem[];
  dailyCompletedCount: number;
  lastCompletionDate: string | null;
  isFocusMode: boolean;

  setUserId: (userId: string | null) => void;
  fetchTasks: () => Promise<void>;
  clearTasks: () => void;
  setSelectedDate: (date: Date) => void;
  setViewingTaskId: (id: string | null) => void;
  addTask: (task: Omit<Task, 'id' | 'status'>) => Promise<void>;
  openRescheduleModal: (id: string) => void;
  closeRescheduleModal: () => void;
  hideRecurrenceSuccess: () => void;
  hideAdvanceModal: () => void;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string, options?: { deleteSeries?: boolean; deleteSubsequent?: boolean }) => Promise<void>;
  startTask: (id: string, options?: { pauseOthers?: boolean }) => Promise<void>;
  advanceTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  cancelTask: (id: string, options?: { cancelSeriesSubsequent?: boolean }) => Promise<void>;
  showCancelConfirmation: (id: string) => void;
  hideCancelConfirmation: () => void;
  showCompleteConfirmation: (id: string) => void;
  hideCompleteConfirmation: () => void;
  handleOverdue: (id: string) => Promise<void>;
  extendTask: (id: string, additionalMinutes: number) => Promise<void>;
  rescheduleTask: (id: string, newStartTime: Date, options?: { allowOverlap?: boolean; applyToSeries?: boolean }) => Promise<void>;
  pauseTask: (id: string) => Promise<void>;
  resumeTask: (id: string) => Promise<void>;
  setOverlapData: (data: { activeTaskId: string, nextTaskId: string } | null) => void;
  closeOverlapModal: () => void;
  checkOverlaps: () => void;
  enqueueModal: (type: ModalType, taskId: string) => void;
  resolveCurrentModal: () => void;
  setFocusMode: (enabled: boolean) => void;
  purgeAllData: () => Promise<void>;

  // Start Conflict Logic
  showStartConflictModal: boolean;
  startConflictTaskId: string | null;
  startConflictIsAdvance: boolean;
  openStartConflictModal: (taskId: string, isAdvance?: boolean) => void;
  closeStartConflictModal: () => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      activeTaskId: null,
      viewingTaskId: null,
      selectedDate: new Date(),
      showAdvanceModal: false,
      advanceTaskId: null,
      showConfirmCancel: false,
      cancelTaskId: null,
      showConfirmComplete: false,
      completeTaskId: null,
      showRescheduleModal: false,
      rescheduleTaskId: null,
      showRecurrenceSuccess: false,
      recurrenceHorizon: 180,
      isLoading: false,
      userId: null,
      showOverlapModal: false,
      overlapData: null,
      modalQueue: [],
      dailyCompletedCount: 0,
      lastCompletionDate: null,
      isFocusMode: false,

      showStartConflictModal: false,
      startConflictTaskId: null,
      startConflictIsAdvance: false,

      setUserId: (userId) => {
        if (userId !== get().userId) {
          set({ userId });
          if (userId) get().fetchTasks();
        }
      },

      fetchTasks: async () => {
        const userId = get().userId;
        if (!userId) return;
        set({ isLoading: true });

        // 1. Carrega do banco local (Dexie) imediatamente
        const allLocalTasks = await db.tasks.toArray();
        
        // Suporte para usuários antigos ou sessões onde o userId falhou
        // Adotamos tarefas que estão sem userId ou com userId 'null'
        const mappedLocal = allLocalTasks
          .filter(t => !t.deletedAt && (!t.userId || t.userId === userId))
          .map(t => ({
            ...t,
            startTime: new Date(t.startTime),
            completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
            userId: t.userId || userId // Adota temporariamente para a UI
          }));
        
        // Se houver tarefas sem userId, atualizamos no banco para garantir consistência
        const orphans = allLocalTasks.filter(t => !t.userId);
        if (orphans.length > 0) {
            console.log(`[Store] Adotando ${orphans.length} tarefas órfãs para o usuário ${userId}`);
            await Promise.all(orphans.map(t => db.tasks.update(t.id, { userId })));
        }

        set({ tasks: mappedLocal });
        set({ isLoading: false });

        // 2. Tenta puxar mudanças remotas em background
        try {
          await pullRemoteChanges(userId);
          // Re-sync state após pull
          const updatedLocal = await db.tasks.toArray();
          set({ 
            tasks: updatedLocal
              .filter(t => !t.deletedAt)
              .map(t => ({ ...t, startTime: new Date(t.startTime), completedAt: t.completedAt ? new Date(t.completedAt) : undefined })) 
          });
        } catch (e) {
          console.warn('Sync failed, using local data only');
        }
      },

      clearTasks: async () => {
        set({ tasks: [], userId: null, activeTaskId: null });
        await db.tasks.clear();
        await db.sync_operations.clear();
      },

      setSelectedDate: (date) => set({ selectedDate: date }),
      setViewingTaskId: (id) => set({ viewingTaskId: id }),

      openRescheduleModal: (id) => set({ showRescheduleModal: true, rescheduleTaskId: id }),
      // closeRescheduleModal moved to avoid hoisting issues, see below


      addTask: async (taskData) => {
        const now = new Date();
        now.setSeconds(0, 0); // Ignore seconds and ms for comparison
        if (taskData.startTime < now) {
          console.error('Tentativa de adicionar tarefa no passado bloqueada pelo store.');
          return;
        }
        const seriesId = taskData.recurrence?.seriesId || crypto.randomUUID();
        const newTasks: Task[] = [];
        let showSuccess = false;

        const horizonDays = get().recurrenceHorizon;
        const start = new Date(taskData.startTime);

        if (taskData.recurrence && taskData.recurrence.ruleType !== 'none') {
          showSuccess = true;
          const rule = taskData.recurrence.ruleType;
          const horizonEnd = new Date(start.getTime() + horizonDays * 24 * 60 * 60 * 1000);

          const occurrenceBase = {
            ...taskData,
            status: 'pending' as TaskStatus,
            recurrence: { ...taskData.recurrence, seriesId, createdAt: new Date().toISOString() }
          };

          if (rule === 'daily' || rule === 'weekly' || rule === 'monthly') {
            let current = new Date(start);
            while (current <= horizonEnd) {
              const occDate = current.toISOString().split('T')[0];
              newTasks.push({
                ...occurrenceBase,
                id: crypto.randomUUID(),
                startTime: new Date(current),
                occurrence: { seriesId, occurrenceDate: occDate, isSeriesMaster: current.getTime() === start.getTime() },
                userId: get().userId!
              });
              if (rule === 'daily') current.setDate(current.getDate() + 1);
              else if (rule === 'weekly') current.setDate(current.getDate() + 7);
              else if (rule === 'monthly') {
                const nextMonth = new Date(current);
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                const originalDay = start.getDate();
                const lastDayOfNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
                nextMonth.setDate(Math.min(originalDay, lastDayOfNextMonth));
                current = nextMonth;
              }
            }
          } else if (rule === 'custom' && taskData.recurrence.customDates) {
            taskData.recurrence.customDates.forEach(dateStr => {
              const parts = dateStr.split('-').map(Number);
              const current = new Date(parts[0], parts[1] - 1, parts[2], start.getHours(), start.getMinutes());
              newTasks.push({
                ...occurrenceBase,
                id: crypto.randomUUID(),
                startTime: current,
                occurrence: { seriesId, occurrenceDate: dateStr, isSeriesMaster: current.getTime() === start.getTime() },
                userId: get().userId!
              });
            });
          }
        } else {
          newTasks.push({ ...taskData, id: crypto.randomUUID(), status: 'pending' as TaskStatus, userId: get().userId! });
        }

        const stateTasks = [...get().tasks, ...newTasks].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        set({ tasks: stateTasks, showRecurrenceSuccess: showSuccess });

        // Grava no Dexie e Oplog
        const userId = get().userId;
        for (const t of newTasks) {
          const local: LocalTask = {
            ...t,
            startTime: t.startTime.toISOString(),
            completedAt: t.completedAt?.toISOString(),
            updatedAt: Date.now(),
            userId: userId!
          };
          await db.tasks.put(local);
          await logSyncOperation('tasks', 'INSERT', t.id, { ...local, userId });
        }
      },

      hideRecurrenceSuccess: () => set({ showRecurrenceSuccess: false }),

      updateTask: async (id, updates) => {
        const state = get();
        const task = state.tasks.find(t => t.id === id);
        if (!task) return;

        // Garantir que startTime seja sempre um objeto Date
        const currentTaskStartTime = task.startTime instanceof Date ? task.startTime : new Date(task.startTime);
        const newStartTime = updates.startTime
          ? (updates.startTime instanceof Date ? updates.startTime : new Date(updates.startTime))
          : currentTaskStartTime;

        const updatedTask = { ...task, ...updates, startTime: newStartTime };
        const tasks = [...state.tasks];
        const taskIndex = tasks.findIndex(t => t.id === id);
        tasks[taskIndex] = updatedTask;

        // Se o horário de início ou a duração mudou, podemos precisar de ajuste em cascata
        const timeChanged = updates.startTime && newStartTime.getTime() !== currentTaskStartTime.getTime();
        const durationChanged = updates.durationMinutes !== undefined && updates.durationMinutes !== task.durationMinutes;

        const pSync: Promise<void>[] = [];

        if (timeChanged || durationChanged) {
          // Track displacement for the task itself if it moves forward
          if (timeChanged && newStartTime > currentTaskStartTime) {
            const displacement = Math.ceil((newStartTime.getTime() - currentTaskStartTime.getTime()) / 60000);
            updatedTask.pushedMinutesCaused = (updatedTask.pushedMinutesCaused || 0) + displacement;
            if (!updatedTask.originalPlannedStartAt) {
              updatedTask.originalPlannedStartAt = currentTaskStartTime.toISOString();
            }
          }

          const anchorDateStr = (updatedTask.startTime instanceof Date ? updatedTask.startTime : new Date(updatedTask.startTime)).toDateString();
          // Ordenar para garantir cascata correta
          const sorted = [...tasks].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
          const newIndex = sorted.findIndex(t => t.id === id);

          for (let i = newIndex + 1; i < sorted.length; i++) {
            const current = sorted[i];
            const currentStart = current.startTime instanceof Date ? current.startTime : new Date(current.startTime);
            if (currentStart.toDateString() !== anchorDateStr) continue;

            const previous = sorted[i - 1];
            const previousStart = previous.startTime instanceof Date ? previous.startTime : new Date(previous.startTime);
            const previousEnd = addMinutes(previousStart, previous.durationMinutes);

            if (currentStart < previousEnd) {
              const delta = Math.ceil((previousEnd.getTime() - currentStart.getTime()) / 60000);
              const endOfDay = new Date(previousEnd);
              endOfDay.setHours(23, 59, 59, 999);
              const currentEnd = addMinutes(previousEnd, current.durationMinutes);

              const newUpdates = {
                startTime: previousEnd,
                overflowToNextDayCandidate: currentEnd > endOfDay,
                pushedMinutesCaused: (current.pushedMinutesCaused || 0) + delta
              };

              // Atualizar no array local para o próximo loop
              sorted[i] = { ...current, ...newUpdates };

              const localUpdate: LocalTask = {
                ...sorted[i],
                startTime: sorted[i].startTime.toISOString(),
                completedAt: sorted[i].completedAt?.toISOString(),
                updatedAt: Date.now(),
                userId: state.userId!
              };
              pSync.push(db.tasks.put(localUpdate).then(() => { }));
              pSync.push(logSyncOperation('tasks', 'UPDATE', current.id, { ...localUpdate, userId: state.userId }));
            }
          }
          set({ tasks: sorted });
        } else {
          set({ tasks: tasks.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) });
        }


        const local: LocalTask = {
          ...updatedTask,
          startTime: updatedTask.startTime.toISOString(),
          completedAt: updatedTask.completedAt?.toISOString(),
          updatedAt: Date.now(), // Always bump local timestamp on write = Last Write Wins
          userId: state.userId!
        };

        // Potential Enhancement for Sync Conflict Resolution:
        // if (updates.updatedAt && updates.updatedAt < task.updatedAt) { return; } 
        // But for local-first user actions, we always win locally first.

        pSync.push(db.tasks.put(local).then(() => { }));
        pSync.push(logSyncOperation('tasks', 'UPDATE', id, { ...local, userId: state.userId }));

        await Promise.all(pSync);
      },

      deleteTask: async (id: string, options?: { deleteSeries?: boolean, deleteSubsequent?: boolean }) => {
        // Soft Delete Implementation
        const now = new Date().toISOString();
        const state = get();
        const task = state.tasks.find(t => t.id === id);
        if (!task) return;

        const idsToDelete: string[] = [id];

        // Handle Series/Subsequent Deletion
        const seriesId = task.occurrence?.seriesId || task.recurrence?.seriesId;
        if (seriesId) {
          if (options?.deleteSeries) {
            const seriesTasks = state.tasks.filter(t => t.occurrence?.seriesId === seriesId || t.recurrence?.seriesId === seriesId);
            seriesTasks.forEach(t => {
              if (t.id !== id) idsToDelete.push(t.id);
            });
          } else if (options?.deleteSubsequent) {
            const occurrenceDate = task.occurrence?.occurrenceDate;
            const subsequent = state.tasks.filter(t =>
              (t.occurrence?.seriesId === seriesId || t.recurrence?.seriesId === seriesId) &&
              t.occurrence?.occurrenceDate! > (occurrenceDate || '')
            );
            idsToDelete.push(...subsequent.map(t => t.id));
          }
        }

        // Optimistic UI update
        set((state) => ({
          tasks: state.tasks.filter((t) => !idsToDelete.includes(t.id)),
          activeTaskId: idsToDelete.includes(state.activeTaskId || '') ? null : state.activeTaskId,
          modalQueue: state.modalQueue.filter(m => !idsToDelete.includes(m.taskId))
        }));

        // DB update and Sync Log
        const nowMs = Date.now();
        const updates: Promise<void>[] = [];
        
        for (const targetId of idsToDelete) {
          const taskData = state.tasks.find(t => t.id === targetId);
          updates.push(db.tasks.update(targetId, { deletedAt: now, updatedAt: nowMs, userId: get().userId! }).then(() => { }));
          updates.push(logSyncOperation('tasks', 'DELETE', targetId, {
            ...taskData,
            deletedAt: now,
            userId: get().userId
          }));
        }

        await Promise.all(updates);
      },

      startTask: async (id: string, options?: { pauseOthers?: boolean }) => {
        const state = get();
        const task = state.tasks.find(t => t.id === id);
        if (!task) return;

        // V9.13 Guard: Don't start if already in-progress or completed elsewhere
        if (task.status !== 'pending') {
          console.warn(`[startTask] Guard triggered: Task ${id} is already ${task.status}. Aborting.`);
          set({ modalQueue: state.modalQueue.filter(m => m.taskId !== id) });
          return;
        }

        const now = new Date();
        const start = task.startTime instanceof Date ? task.startTime : new Date(task.startTime);
        const end = addMinutes(start, task.durationMinutes);

        if (now > end) {
          get().enqueueModal('overdue-resolution', id);
          return;
        }

        // Standard Start Logic with Optional Pause
        const currentActiveId = state.activeTaskId;
        const shouldPauseOthers = options?.pauseOthers !== false; // Default to true

        console.log('[startTask] Starting:', id, 'CurrentActive:', currentActiveId, 'PauseOthers:', shouldPauseOthers);

        if (currentActiveId && currentActiveId !== id && shouldPauseOthers) {
          console.log('[startTask] Pausing active task:', currentActiveId);
          await state.pauseTask(currentActiveId);
        } else {
          console.log('[startTask] logic skipped pause:', { currentActiveId, id, shouldPauseOthers });
        }

        await state.updateTask(id, { status: 'in-progress' });
        set({ activeTaskId: id });
      },

      advanceTask: async (id) => {
        const currentTask = get().tasks.find(t => t.id === id);
        if (currentTask && currentTask.status !== 'pending') {
          console.warn(`[advanceTask] Guard triggered: Task ${id} is already ${currentTask.status}. Aborting.`);
          set({ showAdvanceModal: false, advanceTaskId: null });
          return;
        }
        const currentActiveId = get().activeTaskId;
        if (currentActiveId && currentActiveId !== id) {
          await get().pauseTask(currentActiveId);
        }
        const now = new Date();
        await get().updateTask(id, { startTime: now, status: 'in-progress' });
        set({ activeTaskId: id, showAdvanceModal: false, advanceTaskId: null });
      },

      hideAdvanceModal: () => set({ showAdvanceModal: false, advanceTaskId: null }),

      completeTask: async (id) => {
        const task = get().tasks.find(t => t.id === id);
        if (task && task.status === 'completed') {
          console.warn(`[completeTask] Guard triggered: Task ${id} already completed. Aborting.`);
          set({ activeTaskId: get().activeTaskId === id ? null : get().activeTaskId });
          return;
        }
        const { playSound } = await import('../utils/audio');
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        // Handle Daily Combo and Points
        let newCount = get().dailyCompletedCount + 1;
        const isNewDay = get().lastCompletionDate !== dateStr;
        if (isNewDay) {
          newCount = 1;
        }

        playSound('complete');
        await get().updateTask(id, { status: 'completed', completedAt: now, actualEndAt: now.toISOString() });

        set((state) => ({
          activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
          dailyCompletedCount: newCount,
          lastCompletionDate: dateStr
        }));

        // Award points in Habit Store
        const { useHabitStore } = await import('./useHabitStore');
        const habitStore = useHabitStore.getState();

        // +2 points per task
        habitStore.updateVitality(2);

        // +15 bonus for the 3rd task combo
        if (newCount === 3) {
          habitStore.updateVitality(15);
          console.log('[Gamification] Task Combo! +15 Vitality awarded.');
        }
      },

      cancelTask: async (id, options) => {
        const state = get();
        const taskToCancel = state.tasks.find(t => t.id === id);
        if (!taskToCancel) return;

        const seriesId = taskToCancel.occurrence?.seriesId;
        const cancelSubsequent = options?.cancelSeriesSubsequent && seriesId;
        const occurrenceDate = taskToCancel.occurrence?.occurrenceDate;

        const idsToCancel = [id];
        if (cancelSubsequent) {
          const subsequent = state.tasks.filter(t =>
            t.occurrence?.seriesId === seriesId &&
            t.occurrence.occurrenceDate > (occurrenceDate || '')
          );
          idsToCancel.push(...subsequent.map(t => t.id));
        }

        // 1. Optimistic UI update (One set call)
        const updatedTasks = state.tasks.map(t => 
          idsToCancel.includes(t.id) ? { ...t, status: 'cancelled' as TaskStatus } : t
        );

        // RESOLVE MODAL QUEUE BEFORE CLEARING IDs
        const { modalQueue } = state;
        const newQueue = modalQueue.filter(m => !idsToCancel.includes(m.taskId));

        set({ 
          tasks: updatedTasks,
          activeTaskId: idsToCancel.includes(state.activeTaskId || '') ? null : state.activeTaskId,
          showConfirmCancel: false,
          cancelTaskId: null,
          modalQueue: newQueue
        });

        // 2. Batch DB and Sync Operations
        const pSync: Promise<void>[] = [];
        const now = Date.now();

        for (const targetId of idsToCancel) {
          const task = updatedTasks.find(t => t.id === targetId);
          if (task) {
            const local: LocalTask = {
              ...task,
              startTime: task.startTime.toISOString(),
              completedAt: task.completedAt?.toISOString(),
              updatedAt: now,
              userId: state.userId!
            };
            pSync.push(db.tasks.put(local).then(() => {}));
            pSync.push(logSyncOperation('tasks', 'UPDATE', targetId, { ...local, userId: state.userId }));
          }
        }

        await Promise.all(pSync);
      },

      closeRescheduleModal: () => {
        const { modalQueue, rescheduleTaskId } = get();
        if (modalQueue.length > 0 && modalQueue[0].taskId === rescheduleTaskId) {
          get().resolveCurrentModal();
        }
        set({ showRescheduleModal: false, rescheduleTaskId: null });
      },

      showCancelConfirmation: (id) => set({ showConfirmCancel: true, cancelTaskId: id }),
      hideCancelConfirmation: () => {
        const { modalQueue, cancelTaskId } = get();
        if (modalQueue.length > 0 && modalQueue[0].taskId === cancelTaskId) {
          get().resolveCurrentModal();
        }
        set({ showConfirmCancel: false, cancelTaskId: null });
      },

      showCompleteConfirmation: (id) => set({ showConfirmComplete: true, completeTaskId: id }),
      hideCompleteConfirmation: () => {
        const { modalQueue, completeTaskId } = get();
        if (modalQueue.length > 0 && modalQueue[0].taskId === completeTaskId) {
          get().resolveCurrentModal();
        }
        set({ showConfirmComplete: false, completeTaskId: null });
      },

      handleOverdue: async (id) => {
        const t = get().tasks.find(tk => tk.id === id);
        if (!t || t.status === 'overdue') return;
        
        console.log('[Store] Marking task as overdue:', id);
        await get().updateTask(id, { 
            status: 'overdue', 
            overdueStartedAt: new Date().toISOString(), 
            overdueMinutes: 0 
        });
      },

      extendTask: async (id, additionalMinutes) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === id);
        if (!task) return;

        const originalStart = task.originalPlannedStartAt || task.startTime.toISOString();
        const originalEnd = task.originalPlannedEndAt || addMinutes(task.startTime, task.durationMinutes).toISOString();

        await get().updateTask(id, {
          durationMinutes: task.durationMinutes + additionalMinutes,
          extensionsCount: (task.extensionsCount || 0) + 1,
          extendedMinutesTotal: (task.extendedMinutesTotal || 0) + additionalMinutes,
          pushedMinutesCaused: (task.pushedMinutesCaused || 0) + additionalMinutes,
          originalPlannedStartAt: originalStart,
          originalPlannedEndAt: originalEnd,
        });
      },

      rescheduleTask: async (id, newStartTime, options) => {
        const now = new Date();
        now.setSeconds(0, 0);
        if (newStartTime < now) {
          console.error('Tentativa de reagendar tarefa no passado bloqueada pelo store.');
          return;
        }
        const state = get();
        const mainTask = state.tasks.find(t => t.id === id);
        if (!mainTask) return;

        let workingTasks = [...state.tasks];
        const affectedDates = new Set<string>();
        const allowOverlap = options?.allowOverlap ?? mainTask.allowOverlap;

        // 1. Prepare target tasks for update
        const tasksToMove = [mainTask];
        if (options?.applyToSeries && mainTask.recurrence?.seriesId) {
          const seriesId = mainTask.recurrence.seriesId;
          const subsequent = state.tasks.filter(t =>
            t.recurrence?.seriesId === seriesId &&
            t.id !== id &&
            new Date(t.startTime) > new Date(mainTask.startTime)
          );
          tasksToMove.push(...subsequent);
        }

        const newHours = newStartTime.getHours();
        const newMinutes = newStartTime.getMinutes();

        // Map of taskId -> newStartTime
        const taskNewStarts = new Map<string, Date>();

        for (const t of tasksToMove) {
          let tNewStart: Date;
          if (t.id === id) {
            tNewStart = newStartTime;
          } else {
            tNewStart = t.startTime instanceof Date ? new Date(t.startTime) : new Date(t.startTime);
            tNewStart.setHours(newHours, newMinutes, 0, 0);
          }
          taskNewStarts.set(t.id, tNewStart);
          affectedDates.add(tNewStart.toDateString());
        }

        // 2. Apply initial moves and track changes
        const changedTaskIds = new Set<string>();

        workingTasks = workingTasks.map(t => {
          const nStart = taskNewStarts.get(t.id);
          if (nStart) {
            const currentStart = t.startTime instanceof Date ? t.startTime : new Date(t.startTime);
            const timeChanged = nStart.getTime() !== currentStart.getTime();

            if (timeChanged) {
              changedTaskIds.add(t.id);
              const originalStart = t.originalPlannedStartAt || currentStart.toISOString();
              const originalEnd = t.originalPlannedEndAt || addMinutes(currentStart, t.durationMinutes).toISOString();

              let pushedMins = t.pushedMinutesCaused || 0;
              if (nStart > currentStart) {
                pushedMins += Math.ceil((nStart.getTime() - currentStart.getTime()) / 60000);
              }

              return {
                ...t,
                startTime: nStart,
                status: 'pending',
                rescheduleCount: (t.rescheduleCount || 0) + 1,
                originalPlannedStartAt: originalStart,
                originalPlannedEndAt: originalEnd,
                pushedMinutesCaused: pushedMins,
                allowOverlap
              };
            }
          }
          return t;
        });

        // 3. Perform Cascade for EACH affected date if allowOverlap is false
        if (!allowOverlap) {
          for (const dateStr of affectedDates) {
            // Sort only tasks of that day
            const tasksOnThisDay = workingTasks.filter(t =>
              (t.startTime instanceof Date ? t.startTime : new Date(t.startTime)).toDateString() === dateStr
            ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

            for (let i = 1; i < tasksOnThisDay.length; i++) {
              const previous = tasksOnThisDay[i - 1];
              const current = tasksOnThisDay[i];

              const prevStart = previous.startTime instanceof Date ? previous.startTime : new Date(previous.startTime);
              const prevEnd = addMinutes(prevStart, previous.durationMinutes);
              const currentStart = current.startTime instanceof Date ? current.startTime : new Date(current.startTime);

              if (currentStart < prevEnd && !current.allowOverlap) {
                const delta = Math.ceil((prevEnd.getTime() - currentStart.getTime()) / 60000);
                const endOfDayMax = new Date(prevEnd);
                endOfDayMax.setHours(23, 59, 59, 999);
                const currentEnd = addMinutes(prevEnd, current.durationMinutes);

                const updated = {
                  ...current,
                  startTime: prevEnd,
                  overflowToNextDayCandidate: currentEnd > endOfDayMax,
                  pushedMinutesCaused: (current.pushedMinutesCaused || 0) + delta
                };

                tasksOnThisDay[i] = updated;
                changedTaskIds.add(current.id);

                // Sync back to workingTasks
                const idxInWorking = workingTasks.findIndex(tx => tx.id === current.id);
                if (idxInWorking !== -1) workingTasks[idxInWorking] = updated;
              }
            }
          }
        }

        // 4. Update state once
        set({ tasks: workingTasks.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) });

        // 5. Database Writes
        const pSync: Promise<void>[] = [];
        for (const tid of changedTaskIds) {
          const updated = workingTasks.find(t => t.id === tid);
          if (updated) {
            const local: LocalTask = {
              ...updated,
              startTime: updated.startTime.toISOString(),
              completedAt: updated.completedAt?.toISOString(),
              updatedAt: Date.now(),
              userId: state.userId!
            };
            pSync.push(db.tasks.put(local).then(() => { }));
            pSync.push(logSyncOperation('tasks', 'UPDATE', tid, { ...local, userId: state.userId }));
          }
        }

        await Promise.all(pSync);
      },

      pauseTask: async (id) => {
        await get().updateTask(id, {
          status: 'paused',
          pausedAt: new Date().toISOString()
        });
      },

      resumeTask: async (id) => {
        const currentActiveId = get().activeTaskId;
        if (currentActiveId && currentActiveId !== id) {
          await get().pauseTask(currentActiveId);
        }

        const task = get().tasks.find(t => t.id === id);
        if (!task || !task.pausedAt) return;

        const pausedAt = new Date(task.pausedAt);
        const now = new Date();
        const deltaMs = now.getTime() - pausedAt.getTime();

        // Only push if paused for more than 30 seconds
        const deltaMinutes = Math.floor(deltaMs / 60000);

        await get().updateTask(id, {
          status: 'in-progress',
          totalPausedMs: (task.totalPausedMs || 0) + deltaMs,
          durationMinutes: task.durationMinutes + deltaMinutes,
          pausedAt: undefined
        });
        set({ activeTaskId: id });
      },

      setOverlapData: (data) => set({ showOverlapModal: !!data, overlapData: data }),
      closeOverlapModal: () => set({ showOverlapModal: false, overlapData: null }),

      checkOverlaps: () => {
        const { tasks, activeTaskId, showOverlapModal, modalQueue } = get();
        if (!activeTaskId || showOverlapModal) return;

        // Prevent overlap check if there is already a START modal for this task or overlapping task
        // This avoids double popping (Start + Overlap)
        if (modalQueue.some(m => m.type === 'start')) return;

        const activeTask = tasks.find(t => t.id === activeTaskId);
        if (!activeTask || activeTask.status !== 'in-progress') return;

        const now = new Date();
        const nextTask = tasks.find(t => {
          if (t.status !== 'pending' || t.id === activeTaskId) return false;
          const startTime = new Date(t.startTime);
          const diffMs = now.getTime() - startTime.getTime();

          // STRICTER WINDOW: Only tasks planned for TODAY that started in the last 15 mins
          // OR are about to start in the next 1 min.
          // This avoids ancient tasks from hours/days ago triggering the modal.
          const isToday = isSameDay(startTime, now);

          // FIX: Increase lower bound to 45s (45000ms) to avoid overlap with StartModal monitoring 
          // which triggers at 0. giving a buffer where neither might trigger if we aren't careful?
          // StartModal triggers if diffMs <= 0 && diffMs > -60000.
          // So StartModal covers [0, -60s].
          // We want OverlapModal to be a "Pre-warning".
          // If we set > 45s, then from 45s down to 0, no Overlap modal.
          // This prevents them hopping on top of each other.
          const isWindow = diffMs >= 45000 && diffMs < 900000; // +45s to +15m

          return isToday && isWindow;
        });

        if (nextTask) {
          get().enqueueModal('overlap', nextTask.id);
        }
      },

      enqueueModal: (type, taskId) => {
        const { modalQueue } = get();
        // Prevent exact duplicates (same type and taskId within the queue)
        if (modalQueue.some(m => m.type === type && m.taskId === taskId)) return;

        const newItem: ModalQueueItem = {
          id: `${type}-${taskId}-${Date.now()}`,
          type,
          taskId,
          timestamp: Date.now()
        };

        set({ modalQueue: [...modalQueue, newItem].sort((a, b) => a.timestamp - b.timestamp) });
      },

      resolveCurrentModal: () => {
        const { modalQueue } = get();
        if (modalQueue.length === 0) return;
        set({ modalQueue: modalQueue.slice(1) });
      },

      openStartConflictModal: (taskId, isAdvance = false) => set({ showStartConflictModal: true, startConflictTaskId: taskId, startConflictIsAdvance: isAdvance }),
      closeStartConflictModal: () => set({ showStartConflictModal: false, startConflictTaskId: null, startConflictIsAdvance: false }),

      setFocusMode: (enabled) => set({ isFocusMode: enabled }),

      purgeAllData: async () => {
        console.log('[Store] Full Purge started...');
        const state = get();
        if (!state.userId) {
            console.warn('[Store] Purge aborted: no userId found');
            return;
        }

        try {
            // 1. Clear Local (Dexie) - TOP PRIORITY
            await Promise.all([
                db.tasks.clear(),
                db.habits.clear(),
                db.habit_completions.clear(),
                db.sync_operations.clear(),
                db.sync_metadata.clear()
            ]);
            console.log('[Store] Local Dexie cleared');

            // 2. Clear Remote (Supabase) - Soft Delete everything
            if (navigator.onLine) {
                try {
                    const remoteCleanup = Promise.all([
                        supabase.from('tasks').update({ deleted: true }).eq('user_id', state.userId),
                        supabase.from('habits').update({ deleted: true }).eq('user_id', state.userId),
                        supabase.from('habit_completions').update({ deleted: true }).eq('user_id', state.userId),
                        supabase.from('settings').update({ deleted: true }).eq('user_id', state.userId)
                    ]);
                    
                    const timeout = new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000));
                    await Promise.race([remoteCleanup, timeout]);
                    console.log('[Store] Remote Supabase cleanup attempted');
                } catch (e) {
                    console.error('[Store] Remote cleanup failed or timed out, continuing...', e);
                }
            }

            // 3. Reset state & Reload
            set({ tasks: [], activeTaskId: null, viewingTaskId: null });
            console.log('[Store] Purge complete. Reloading...');
            window.location.reload();
        } catch (err) {
            console.error('[Store] Fatal error during purgeAllData:', err);
            alert('Erro ao limpar dados. Por favor, tente novamente ou reinstale o app.');
        }
      }
    }),
    {
      name: 'time-blocking-tasks',
      partialize: (state) => ({
        // tasks: state.tasks, // REMOVED: Managed by Dexie
        recurrenceHorizon: state.recurrenceHorizon,
        activeTaskId: state.activeTaskId,
        selectedDate: state.selectedDate,
        dailyCompletedCount: state.dailyCompletedCount,
        lastCompletionDate: state.lastCompletionDate
      }),
      onRehydrateStorage: () => (state) => {
        // No need to rehydrate tasks from localStorage anymore
        if (state && state.selectedDate) {
          state.selectedDate = new Date(state.selectedDate);
        }
      }
    }
  )
);
