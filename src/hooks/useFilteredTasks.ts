import { useMemo } from "react";
import { type Task } from "@/lib/mock-data";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { isWithinInterval, parseISO } from "date-fns";
import { useTasksData } from "./useTasksData";

export function useFilteredTasks(): Task[] {
  const { dateRange } = useDateFilter();
  const { data: allTasks = [] } = useTasksData();

  return useMemo(() => {
    return allTasks.filter((task) => {
      try {
        const taskDate = parseISO(task.date_worked);
        return isWithinInterval(taskDate, { start: dateRange.from, end: dateRange.to });
      } catch (e) {
        return false;
      }
    });
  }, [dateRange, allTasks]);
}