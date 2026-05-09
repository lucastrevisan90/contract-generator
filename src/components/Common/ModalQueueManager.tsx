import React from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { StartTaskModal } from '../Modals/StartTaskModal';
import { OverdueResolutionModal } from '../Modals/OverdueResolutionModal';
import { OverlapModal } from '../Modals/OverlapModal';
import { TimeUpModal } from '../Modals/TimeUpModal';

export const ModalQueueManager: React.FC = () => {
    const {
        modalQueue,
        resolveCurrentModal,
        tasks,
        showRescheduleModal,
        rescheduleTaskId,
        showConfirmCancel,
        cancelTaskId,
        showConfirmComplete,
        completeTaskId
    } = useTaskStore();

    if (modalQueue.length === 0) return null;

    const currentModal = modalQueue[0];
    const task = tasks.find(t => t.id === currentModal.taskId);

    // INTERRUPTION LOGIC:
    // If we are currently rescheduling/cancelling/completing THIS task, hide the queue modal temporarily.
    // The queue item remains (blocking execution) until the action finishes.
    const isInteractingWithCurrentTask =
        (showRescheduleModal && rescheduleTaskId === currentModal.taskId) ||
        (showConfirmCancel && cancelTaskId === currentModal.taskId) ||
        (showConfirmComplete && completeTaskId === currentModal.taskId);

    if (isInteractingWithCurrentTask) {
        return null;
    }

    if (!task) {
        // If task not found (deleted?), skip it
        resolveCurrentModal();
        return null;
    }

    switch (currentModal.type) {
        case 'start':
            return (
                <StartTaskModal
                    isOpen={true}
                    onClose={resolveCurrentModal}
                    taskId={task!.id}
                    taskTitle={task!.title}
                />
            );
        case 'overdue-resolution':
            return (
                <OverdueResolutionModal
                    isOpen={true}
                    onClose={resolveCurrentModal}
                    taskId={task!.id}
                />
            );
        case 'time-up':
            return (
                <TimeUpModal
                    isOpen={true}
                    onClose={resolveCurrentModal}
                    onReschedule={() => useTaskStore.getState().openRescheduleModal(task!.id)}
                    taskId={task!.id}
                    taskTitle={task!.title}
                />
            );
        case 'overlap':
            return (
                <OverlapModal
                    isOpen={true}
                    onClose={resolveCurrentModal}
                    taskId={task!.id}
                />
            );
        default:
            return null;
    }
};
