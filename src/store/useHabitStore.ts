import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db, logSyncOperation, LocalHabit, LocalHabitCompletion } from '../lib/db';

export interface Habit {
    id: string;
    title: string;
    color: string;
    daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
    createdAt: Date;
    userId: string;
}

export interface HabitCompletion {
    habitId: string;
    date: string; // YYYY-MM-DD
    userId: string;
}

interface HabitStore {
    habits: Habit[];
    completions: HabitCompletion[];
    isLoading: boolean;
    userId: string | null;
    vitality: number;
    streakCount: number;

    setUserId: (userId: string | null) => void;
    fetchHabits: () => Promise<void>;
    clearHabits: () => void;
    addHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => Promise<void>;
    deleteHabit: (id: string) => Promise<void>;
    toggleHabitCompletion: (habitId: string, date: string) => Promise<void>;
    isHabitCompleted: (habitId: string, date: string) => boolean;
    updateVitality: (points: number) => void;
    checkDailyPenalties: () => void;
    recalculateStreak: () => void;
}

export const useHabitStore = create<HabitStore>()(
    persist(
        (set, get) => ({
            habits: [],
            completions: [],
            isLoading: false,
            userId: null,
            vitality: 50,
            streakCount: 0,

            setUserId: (userId) => {
                if (userId !== get().userId) {
                    set({ userId });
                    if (userId) get().fetchHabits();
                }
            },

            fetchHabits: async () => {
                const userId = get().userId;
                if (!userId) return;
                set({ isLoading: true });

                // Load from Local DB
                const [allLocalHabits, allLocalCompletions] = await Promise.all([
                    db.habits.toArray(),
                    db.habit_completions.toArray()
                ]);

                // Adotar órfãos e GARANTIR sincronia
                const orphansH = allLocalHabits.filter(h => !h.userId);
                if (orphansH.length > 0) {
                    console.log(`[Store] Adotando ${orphansH.length} hábitos órfãos...`);
                    await Promise.all(orphansH.map(h => {
                        return Promise.all([
                            db.habits.update(h.id, { userId }),
                            logSyncOperation('habits', 'INSERT', h.id, { ...h, userId, updatedAt: Date.now() })
                        ]);
                    }));
                }
                const orphansC = allLocalCompletions.filter(c => !c.userId);
                if (orphansC.length > 0) {
                    console.log(`[Store] Adotando ${orphansC.length} completudes órfãs...`);
                    await Promise.all(orphansC.map(c => {
                        const compositeId = `${c.habitId}_${c.date}`;
                        return Promise.all([
                            db.habit_completions.update(c.id, { userId }),
                            logSyncOperation('habit_completions', 'INSERT', compositeId, { ...c, userId, id: compositeId, updatedAt: Date.now() })
                        ]);
                    }));
                }

                set({
                    habits: allLocalHabits
                        .filter(h => !h.userId || h.userId === userId)
                        .map(h => ({ ...h, createdAt: new Date(h.createdAt), userId: h.userId || userId })),
                    completions: allLocalCompletions
                        .filter(c => !c.userId || c.userId === userId)
                        .map(c => ({ habitId: c.habitId, date: c.date, userId: c.userId || userId }))
                });
                get().checkDailyPenalties();
                set({ isLoading: false });

                // Pull remote logic could be here (Sync Engine does it too)
            },

            clearHabits: async () => {
                set({ habits: [], completions: [], userId: null });
                await db.habits.clear();
                await db.habit_completions.clear();
            },

            addHabit: async (habitData) => {
                const newHabit: Habit = {
                    ...habitData,
                    id: crypto.randomUUID(),
                    createdAt: new Date(),
                    userId: get().userId!,
                };
                set((state) => ({ habits: [...state.habits, newHabit] }));

                const local: LocalHabit = { ...newHabit, updatedAt: Date.now(), userId: get().userId! };
                await db.habits.put(local);
                await logSyncOperation('habits', 'INSERT', newHabit.id, { ...local, userId: get().userId });
            },

            deleteHabit: async (id) => {
                set((state) => ({
                    habits: state.habits.filter((h) => h.id !== id),
                    completions: state.completions.filter((c) => c.habitId !== id),
                }));

                await db.habits.delete(id);
                // Also delete related local completions
                const completions = await db.habit_completions.where('habitId').equals(id).toArray();
                for (const c of completions) {
                    await db.habit_completions.delete(c.id);
                    await logSyncOperation('habit_completions', 'DELETE', c.id, { userId: get().userId });
                }
                await logSyncOperation('habits', 'DELETE', id, { userId: get().userId });
            },

            toggleHabitCompletion: async (habitId, date) => {
                const exists = get().completions.some((c) => c.habitId === habitId && c.date === date);
                const compositeId = `${habitId}_${date}`;

                if (exists) {
                    set((state) => ({
                        completions: state.completions.filter((c) => !(c.habitId === habitId && c.date === date)),
                    }));
                    await db.habit_completions.delete(compositeId);
                    await logSyncOperation('habit_completions', 'DELETE', compositeId, { userId: get().userId });
                } else {
                    const newCompletion = { habitId, date, userId: get().userId! };
                    set((state) => ({
                        completions: [...state.completions, newCompletion],
                    }));

                    const local: LocalHabitCompletion = { ...newCompletion, id: compositeId, updatedAt: Date.now(), userId: get().userId! };
                    await db.habit_completions.put(local);
                    await logSyncOperation('habit_completions', 'INSERT', compositeId, { ...local, userId: get().userId });

                    // Gamification: Award 5 points for completion
                    get().updateVitality(5);
                }
                get().recalculateStreak();
            },

            isHabitCompleted: (habitId, date) => {
                return get().completions.some((c) => c.habitId === habitId && c.date === date);
            },

            updateVitality: (points) => {
                const newVitality = Math.max(0, Math.min(100, get().vitality + points));
                set({ vitality: newVitality });
            },

            checkDailyPenalties: () => {
                const { habits, completions } = get();
                if (habits.length === 0) return;

                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                const dayOfWeek = yesterday.getDay();

                const missedHabits = habits.filter(h =>
                    h.daysOfWeek.includes(dayOfWeek) &&
                    !completions.some(c => c.habitId === h.id && c.date === yesterdayStr)
                );

                if (missedHabits.length > 0) {
                    console.log(`[Gamification] ${missedHabits.length} habits missed yesterday. Penalty applied.`);
                    get().updateVitality(-10);
                }
                get().recalculateStreak();
            },

            recalculateStreak: () => {
                const { completions } = get();
                if (completions.length === 0) {
                    set({ streakCount: 0 });
                    return;
                }

                const uniqueDates = Array.from(new Set(completions.map(c => c.date))).sort((a, b) => b.localeCompare(a));
                const today = new Date().toISOString().split('T')[0];
                const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

                if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
                    set({ streakCount: 0 });
                    return;
                }

                let streak = 1;
                for (let i = 0; i < uniqueDates.length - 1; i++) {
                    const d1 = new Date(uniqueDates[i]);
                    const d2 = new Date(uniqueDates[i + 1]);
                    const diff = Math.round((d1.getTime() - d2.getTime()) / 86400000);
                    if (diff === 1) streak++;
                    else break;
                }
                set({ streakCount: streak });
            },
        }),
        {
            name: 'habit-storage',
            partialize: (state) => ({
                // habits: state.habits, // Managed by Dexie
                // completions: state.completions, // Managed by Dexie
                vitality: state.vitality,
                streakCount: state.streakCount
            }),
        }
    )
);
