import React, { useMemo, useState } from 'react';
import { format, startOfDay, addHours, eachHourOfInterval, isSameDay } from 'date-fns';
import { useTaskStore } from '../../store/useTaskStore';
import { TaskCard } from './TaskCard';
import { DateHeader } from './DateHeader';
import { CreateTaskModal } from '../Modals/CreateTaskModal';
import { CognitiveLoadGauge } from '../Dashboard/CognitiveLoadGauge';

export const DayView: React.FC = () => {
  const { tasks, selectedDate } = useTaskStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const startHour = 0; // 0 AM (Midnight)
  const endHour = 23; // 11 PM

  const hours = useMemo(() => {
    const start = addHours(startOfDay(selectedDate), startHour);
    const end = addHours(startOfDay(selectedDate), endHour);
    return eachHourOfInterval({ start, end });
  }, [selectedDate]);

  const todaysTasks = useMemo(() => {
    return tasks.filter(t => isSameDay(t.startTime, selectedDate));
  }, [tasks, selectedDate]);

  // Calculate dynamic height for each hour based on task density
  const BASE_PIXELS_PER_HOUR = 80;

  const hourHeights = useMemo(() => {
    const heights = new Array(24).fill(BASE_PIXELS_PER_HOUR);

    // Find max overlapping tasks for each hour
    hours.forEach((hourDate) => {
      const hour = hourDate.getHours();
      const tasksInHour = todaysTasks.filter(t => {
        const taskStart = t.startTime;
        const taskEnd = new Date(t.startTime.getTime() + t.durationMinutes * 60000);
        const hourStart = hourDate;
        const hourEnd = addHours(hourDate, 1);

        return (taskStart < hourEnd && taskEnd > hourStart);
      });

      // If density is high, expand height
      // e.g., if > 2 tasks, add 40px per extra task
      if (tasksInHour.length > 2) {
        heights[hour] = Math.max(BASE_PIXELS_PER_HOUR, BASE_PIXELS_PER_HOUR + (tasksInHour.length - 2) * 40);
      }
    });

    return heights;
  }, [hours, todaysTasks]);

  // Calculate Y position for a given time
  const getYForTime = (date: Date) => {
    const hour = date.getHours();
    const minutes = date.getMinutes();

    // Sum heights of previous hours
    let y = 0;
    for (let i = startHour; i < hour; i++) {
      y += hourHeights[i];
    }

    // Add fraction of current hour
    y += (minutes / 60) * hourHeights[hour];

    return y;
  };

  const getTaskStyle = (task: typeof tasks[0]) => {
    const startY = getYForTime(task.startTime);
    const endTime = new Date(task.startTime.getTime() + task.durationMinutes * 60000);
    const endY = getYForTime(endTime);

    return {
      top: `${startY}px`,
      height: `${endY - startY}px`,
    };
  };

  const totalHeight = hourHeights.reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col h-full w-full bg-background-primary border border-border rounded-xl overflow-hidden shadow-2xl relative">
      <DateHeader onAddTask={() => setIsCreateModalOpen(true)} />

      <div className="px-3 sm:px-6 pt-4">
        <CognitiveLoadGauge />
      </div>

      <div className="flex-1 overflow-y-auto relative custom-scrollbar bg-background-primary scroll-smooth pt-2" style={{ touchAction: 'pan-y' }}>
        <div className="relative flex min-h-full pb-32" style={{ height: Math.max(totalHeight, 800) }}>
          {/* Time Labels Column */}
          <div className="w-10 sm:w-16 flex-shrink-0 border-r border-border bg-background-secondary/20">
            {hours.map((hour) => (
              <div
                key={hour.toString()}
                className="relative border-b border-border/50"
                style={{ height: hourHeights[hour.getHours()] }}
              >
                <span className="absolute -top-3 right-2 text-xs font-medium text-text-secondary select-none">
                  {format(hour, 'HH:mm')}
                </span>
              </div>
            ))}
          </div>

          {/* Grid & Tasks Column */}
          <div className="flex-1 relative">
            {/* Grid Lines */}
            {hours.map((hour) => {
              const top = getYForTime(hour);
              const height = hourHeights[hour.getHours()];
              return (
                <div
                  key={hour.toString()}
                  className="absolute w-full border-b border-border/30 group"
                  style={{ top, height }}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <div className="w-full h-full hover:bg-background-secondary/10 transition-colors cursor-pointer" />
                </div>
              );
            })}

            {/* Tasks with Overlap Logic */}
            {(() => {
              // Algorithm to handle overlapping tasks
              const sortedTasks = [...todaysTasks].sort((a, b) => {
                const startDiff = a.startTime.getTime() - b.startTime.getTime();
                if (startDiff !== 0) return startDiff;
                // If start time is same, sort by duration (shortest first) to create the "stepped" look
                return a.durationMinutes - b.durationMinutes;
              });
              const layoutGroups: typeof tasks[] = [];

              // Group overlapping tasks
              sortedTasks.forEach(task => {
                let placed = false;
                for (const group of layoutGroups) {
                  if (group.some(t => {
                    const tEnd = new Date(t.startTime.getTime() + t.durationMinutes * 60000);
                    const taskEnd = new Date(task.startTime.getTime() + task.durationMinutes * 60000);
                    return (task.startTime < tEnd && taskEnd > t.startTime);
                  })) {
                    group.push(task);
                    placed = true;
                    break;
                  }
                }
                if (!placed) {
                  layoutGroups.push([task]);
                }
              });

              return layoutGroups.flatMap(group => {
                // Simple column distribution for now (can be improved)
                const widthPercent = 100 / group.length;

                return group.map((task, index) => {
                  const style = getTaskStyle(task);
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      style={{
                        ...style,
                        width: `${widthPercent}%`,
                        left: `${index * widthPercent}%`,
                        position: 'absolute'
                      }}
                    />
                  );
                });
              });
            })()}

            {/* Current Time Line (if today) */}
            {isSameDay(selectedDate, new Date()) && (
              <div
                className="absolute w-full border-t-2 border-red-500 z-10 pointer-events-none flex items-center"
                style={{ top: `${getYForTime(new Date())}px` }}
              >
                <div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialDate={selectedDate}
      />
    </div>
  );
};
