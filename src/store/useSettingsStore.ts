import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SoundType } from '../constants/audio';
import { db, logSyncOperation, LocalSettings } from '../lib/db';

export type Theme = 'dark' | 'light';

export interface SettingsState {
    theme: Theme;
    soundEnabled: boolean;
    volumes: Record<SoundType, number>;
    soundVariants: Record<SoundType, string>;
    userId: string | null;
    cognitiveLoadMeta: number;
    cognitiveLoadLimit: number;
    hasCompletedTutorial: boolean;

    setUserId: (userId: string | null) => void;
    fetchSettings: () => Promise<void>;
    setTheme: (theme: Theme) => void;
    setSoundEnabled: (enabled: boolean) => void;
    setVolume: (type: SoundType, volume: number) => void;
    setSoundVariant: (type: SoundType, variantId: string) => void;
    setCognitiveLoadMeta: (hours: number) => void;
    setCognitiveLoadLimit: (hours: number) => void;
    setHasCompletedTutorial: (completed: boolean) => void;
    clearSettings: () => void;
}

const DEFAULT_VOLUMES: Record<SoundType, number> = {
    start: 0.8,
    overdue: 0.4,
    popup: 0.2,
    success: 0.4,
    complete: 0.4,
    pomodoro_start: 0.6,
    pomodoro_end: 0.7,
    pomodoro_complete: 0.8,
};

const DEFAULT_VARIANTS: Record<SoundType, string> = {
    start: 'classic',
    overdue: 'classic',
    popup: 'classic',
    success: 'classic',
    complete: 'classic',
    pomodoro_start: 'classic',
    pomodoro_end: 'classic',
    pomodoro_complete: 'classic',
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            theme: 'dark',
            soundEnabled: true,
            volumes: DEFAULT_VOLUMES,
            soundVariants: DEFAULT_VARIANTS,
            userId: null,
            cognitiveLoadMeta: 8,
            cognitiveLoadLimit: 12,
            hasCompletedTutorial: false,

            setUserId: (userId) => {
                if (userId !== get().userId) {
                    set({ userId });
                    if (userId) get().fetchSettings();
                }
            },

            fetchSettings: async () => {
                const userId = get().userId;
                if (!userId) return;

                const local = await db.settings.get('current');
                if (local) {
                    set({
                        theme: local.theme,
                        soundEnabled: local.soundEnabled,
                        volumes: local.volumes,
                        soundVariants: local.soundVariants
                    });
                }
            },

            setTheme: async (theme) => {
                set({ theme });
                const userId = get().userId;
                const current = {
                    theme,
                    soundEnabled: get().soundEnabled,
                    volumes: get().volumes,
                    soundVariants: get().soundVariants,
                };
                const local: LocalSettings = { id: 'current', ...current, updatedAt: Date.now(), userId: userId! };
                await db.settings.put(local);
                
                // Debounce Sync Push (V9.11)
                if (userId) {
                    if ((window as any)._settingsSyncTimeout) clearTimeout((window as any)._settingsSyncTimeout);
                    (window as any)._settingsSyncTimeout = setTimeout(async () => {
                        await logSyncOperation('settings', 'UPDATE', 'current', { ...local, userId });
                    }, 2500);
                }
            },

            setSoundEnabled: async (enabled) => {
                set({ soundEnabled: enabled });
                const userId = get().userId;
                const current = {
                    theme: get().theme,
                    soundEnabled: enabled,
                    volumes: get().volumes,
                    soundVariants: get().soundVariants,
                };
                const local: LocalSettings = { id: 'current', ...current, updatedAt: Date.now(), userId: userId! };
                await db.settings.put(local);
                
                if (userId) {
                    if ((window as any)._settingsSyncTimeout) clearTimeout((window as any)._settingsSyncTimeout);
                    (window as any)._settingsSyncTimeout = setTimeout(async () => {
                        await logSyncOperation('settings', 'UPDATE', 'current', { ...local, userId });
                    }, 2500);
                }
            },

            setVolume: async (type, volume) => {
                const newVolumes = { ...get().volumes, [type]: volume };
                set({ volumes: newVolumes });
                const userId = get().userId;
                const current = {
                    theme: get().theme,
                    soundEnabled: get().soundEnabled,
                    volumes: newVolumes,
                    soundVariants: get().soundVariants,
                };
                const local: LocalSettings = { id: 'current', ...current, updatedAt: Date.now(), userId: userId! };
                await db.settings.put(local);
                
                if (userId) {
                    if ((window as any)._settingsSyncTimeout) clearTimeout((window as any)._settingsSyncTimeout);
                    (window as any)._settingsSyncTimeout = setTimeout(async () => {
                        await logSyncOperation('settings', 'UPDATE', 'current', { ...local, userId });
                    }, 2500);
                }
            },

            setSoundVariant: async (type, variantId) => {
                const newVariants = { ...get().soundVariants, [type]: variantId };
                set({ soundVariants: newVariants });
                const userId = get().userId;
                const current = {
                    theme: get().theme,
                    soundEnabled: get().soundEnabled,
                    volumes: get().volumes,
                    soundVariants: newVariants,
                };
                const local: LocalSettings = { id: 'current', ...current, updatedAt: Date.now(), userId: userId! };
                await db.settings.put(local);
                
                if (userId) {
                    if ((window as any)._settingsSyncTimeout) clearTimeout((window as any)._settingsSyncTimeout);
                    (window as any)._settingsSyncTimeout = setTimeout(async () => {
                        await logSyncOperation('settings', 'UPDATE', 'current', { ...local, userId });
                    }, 2500);
                }
            },
            setCognitiveLoadMeta: (hours) => set({ cognitiveLoadMeta: hours }),
            setCognitiveLoadLimit: (hours) => set({ cognitiveLoadLimit: hours }),
            setHasCompletedTutorial: (completed) => set({ hasCompletedTutorial: completed }),
            clearSettings: async () => {
                set({
                    theme: 'dark',
                    soundEnabled: true,
                    volumes: DEFAULT_VOLUMES,
                    soundVariants: DEFAULT_VARIANTS,
                    userId: null,
                    cognitiveLoadMeta: 8,
                    cognitiveLoadLimit: 12,
                    hasCompletedTutorial: false,
                });
                await db.settings.clear();
            },
        }),
        {
            name: 'time-blocking-settings',
            partialize: (state) => ({
                theme: state.theme,
                soundEnabled: state.soundEnabled,
                volumes: state.volumes,
                soundVariants: state.soundVariants,
                cognitiveLoadMeta: state.cognitiveLoadMeta,
                cognitiveLoadLimit: state.cognitiveLoadLimit,
                hasCompletedTutorial: state.hasCompletedTutorial,
            }),
        }
    )
);
