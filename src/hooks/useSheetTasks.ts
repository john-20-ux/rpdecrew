import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Task } from "@/lib/mock-data";

export function useSheetTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sheet-tasks", user?.id],
    queryFn: async (): Promise<Task[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("sheet_tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("date_worked", { ascending: false });

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        date_worked: row.date_worked || "",
        task_link: row.task_link || "",
        status: (row.status as Task["status"]) || "To Do",
        owner: row.owner || "Unknown",
        stage: (row.stage as Task["stage"]) || "Bug",
        completed_at: row.completed_at,
        created_at: row.created_at,
        notes: row.notes || "",
        hours_spent: Number(row.hours_spent) || 0,
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 min
  });
}
