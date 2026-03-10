import { useMemo } from "react";
import { MOCK_TASKS, type Task } from "@/lib/mock-data";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { isWithinInterval, parseISO } from "date-fns";

export function useFilteredTasks(): Task[] {
  const { dateRange } = useDateFilter();

  return useMemo(() => {
    return MOCK_TASKS.filter((task) => {
      const taskDate = parseISO(task.date_worked);
      return isWithinInterval(taskDate, { start: dateRange.from, end: dateRange.to });
    });
  }, [dateRange]);
}
