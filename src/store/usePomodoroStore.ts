import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { playSound, stopSound } from '../utils/audio';

export type PomodoroPhase = 'focus' | 'short_break' | 'long_break' | 'idle';

interface PomodoroSettings {
    focusTime: number; // minutes
    shortBreakTime: number; // minutes
    longBreakTime: number; // minutes
    sessionsBeforeLongBreak: number;
    totalCycles: number;
}

interface PomodoroState {
    phase: PomodoroPhase;
    timeLeft: number; // seconds
    isRunning: boolean;
    currentSession: number; // sessions in current cycle
    currentCycle: number; // 1 to totalCycles
    settings: PomodoroSettings;

    // Actions
    start: () => void;
    pause: () => void;
    stop: () => void;
    reset: () => void;
    tick: () => void;
    updateSettings: (settings: Partial<PomodoroSettings>) => void;
    setPhase: (phase: PomodoroPhase) => void;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
    focusTime: 25,
    shortBreakTime: 5,
    longBreakTime: 15,
    sessionsBeforeLongBreak: 4,
    totalCycles: 1,
};

export const usePomodoroStore = create<PomodoroState>()(
    persist(
        (set, get) => ({
            phase: 'idle',
            timeLeft: DEFAULT_SETTINGS.focusTime * 60,
            isRunning: false,
            currentSession: 1,
            currentCycle: 1,
            settings: DEFAULT_SETTINGS,

            start: () => {
                const { phase, isRunning } = get();
                if (isRunning) return;

                if (phase === 'idle') {
                    set({ phase: 'focus', timeLeft: get().settings.focusTime * 60 });
                }
                
                playSound('pomodoro_start');
                set({ isRunning: true });
            },

            pause: () => {
                stopSound();
                set({ isRunning: false });
            },

            stop: () => {
                stopSound();
                set({ isRunning: false, phase: 'idle', timeLeft: get().settings.focusTime * 60 });
            },

            reset: () => {
                const { settings } = get();
                set({
                    phase: 'idle',
                    timeLeft: settings.focusTime * 60,
                    isRunning: false,
                    currentSession: 1,
                    currentCycle: 1
                });
            },

            updateSettings: (newSettings) => {
                const merged = { ...get().settings, ...newSettings };
                set({ settings: merged });
                if (get().phase === 'idle') {
                    set({ timeLeft: merged.focusTime * 60 });
                }
            },

            setPhase: (phase) => {
                const { settings } = get();
                let time = settings.focusTime * 60;
                if (phase === 'short_break') time = settings.shortBreakTime * 60;
                if (phase === 'long_break') time = settings.longBreakTime * 60;
                set({ phase, timeLeft: time });
            },

            tick: () => {
                const { timeLeft, phase, isRunning, settings, currentSession, currentCycle } = get();
                if (!isRunning) return;

                if (timeLeft > 0) {
                    set({ timeLeft: timeLeft - 1 });
                } else {
                    // Phase ended
                    playSound('pomodoro_end');
                    
                    if (phase === 'focus') {
                        if (currentSession < settings.sessionsBeforeLongBreak) {
                            set({ phase: 'short_break', timeLeft: settings.shortBreakTime * 60 });
                        } else {
                            set({ phase: 'long_break', timeLeft: settings.longBreakTime * 60 });
                        }
                    } else if (phase === 'short_break') {
                        set({ phase: 'focus', timeLeft: settings.focusTime * 60, currentSession: currentSession + 1 });
                    } else if (phase === 'long_break') {
                        if (currentCycle < settings.totalCycles) {
                            set({ 
                                phase: 'focus', 
                                timeLeft: settings.focusTime * 60, 
                                currentSession: 1, 
                                currentCycle: currentCycle + 1 
                            });
                        } else {
                            // All cycles finished
                            playSound('pomodoro_complete');
                            set({ isRunning: false, phase: 'idle', timeLeft: settings.focusTime * 60 });
                        }
                    }
                }
            }
        }),
        {
            name: 'oitoh-pomodoro-store',
            partialize: (state) => ({
                settings: state.settings,
                currentSession: state.currentSession,
                currentCycle: state.currentCycle,
                phase: state.phase,
                timeLeft: state.timeLeft
            })
        }
    )
);
