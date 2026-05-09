import { useEffect, useRef } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { differenceInSeconds } from 'date-fns';
import { playSound, preloadSounds } from '../utils/audio';

export const useSoundAlerts = () => {
    const { tasks, activeTaskId } = useTaskStore();
    const tasksRef = useRef(tasks);

    // Set to track processed audio events to prevent loops
    // Format: "type-id" e.g., "start-task123", "overdue-task456"
    const processedEvents = useRef<Set<string>>(new Set());

    // Preload sounds on mount
    useEffect(() => {
        preloadSounds();
    }, []);

    // Update refs
    useEffect(() => {
        tasksRef.current = tasks;
    }, [tasks]);

    // Cleanup processed events when tasks change status or are removed (optional optimization)
    // For now, we keep it simple: persistent for session avoids double plays.

    // Check for task start (scheduled)
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            tasksRef.current.forEach(task => {
                if (task.status === 'pending') {
                    const diff = differenceInSeconds(now, task.startTime);

                    // Play sound if within window AND not processed
                    if (diff >= 0 && diff <= 2) {
                        const eventId = `start-${task.id}`;
                        if (!processedEvents.current.has(eventId)) {
                            playSound('start');
                            processedEvents.current.add(eventId);
                        }
                    }
                }
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Check for task end (timer) & Overdue
    useEffect(() => {
        if (!activeTaskId) return;

        // We need to re-fetch the active task from the store to get up-to-date values if duration changes,
        // but tasksRef is updated by the other effect.
        // However, this effect depends on activeTaskId. 
        // Safer to find directly in current tasks array (dependency) or ref.
        const activeTask = tasks.find(t => t.id === activeTaskId);
        if (!activeTask || activeTask.status !== 'in-progress') return;

        const interval = setInterval(() => {
            const now = new Date();
            const endTime = new Date(activeTask.startTime.getTime() + activeTask.durationMinutes * 60000);
            const diff = differenceInSeconds(now, endTime);

            // Time up logic (Overdue start)
            if (diff >= 0 && diff <= 2) {
                const eventId = `overdue-${activeTask.id}`;
                if (!processedEvents.current.has(eventId)) {
                    playSound('overdue');
                    processedEvents.current.add(eventId);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [activeTaskId, tasks]); // Depend on tasks to react to duration updates
};
