import { useMemo } from "react";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { isWithinInterval, parseISO } from "date-fns";
import { useSheetTasks } from "@/hooks/useSheetTasks";
import type { Task } from "@/lib/mock-data";

export function useFilteredTasks(): { tasks: Task[]; loading: boolean; hasData: boolean } {
  const { dateRange } = useDateFilter();
  const { data: sheetTasks, isLoading } = useSheetTasks();

  const tasks = useMemo(() => {
    const allTasks = sheetTasks || [];
    return allTasks.filter((task) => {
      if (!task.date_worked) return false;
      try {
        const taskDate = parseISO(task.date_worked);
        return isWithinInterval(taskDate, { start: dateRange.from, end: dateRange.to });
      } catch {
        return false;
      }
    });
  }, [sheetTasks, dateRange]);

  return { tasks, loading: isLoading, hasData: (sheetTasks?.length || 0) > 0 };
}
