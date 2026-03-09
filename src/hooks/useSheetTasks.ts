import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { isWithinInterval, parseISO } from "date-fns";

export interface SheetTask {
  id: string;
  date_worked: string;
  task_link: string;
  status: string;
  owner: string;
  stage: string;
  completed_at: string | null;
  created_at: string;
  notes: string;
  hours_spent: number;
}

interface ActiveSheet {
  id: string;
  spreadsheet_name: string;
  sheet_name: string;
  last_synced_at: string | null;
}

export function useSheetTasks() {
  const [tasks, setTasks] = useState<SheetTask[]>([]);
  const [allTasks, setAllTasks] = useState<SheetTask[]>([]);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const { dateRange } = useDateFilter();

  const fetchTasks = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    // Get active sheet
    const sheetRes = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-sheets-sync`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "active-sheet" }),
      }
    );
    const sheetData = await sheetRes.json();
    setActiveSheet(sheetData.sheet || null);

    if (!sheetData.sheet) {
      setAllTasks([]);
      setTasks([]);
      setLoading(false);
      return;
    }

    // Fetch tasks from DB
    const { data: dbTasks } = await supabase
      .from("sheet_tasks")
      .select("*")
      .eq("sheet_id", sheetData.sheet.id)
      .order("date_worked", { ascending: false });

    const mapped: SheetTask[] = (dbTasks || []).map((t: any) => ({
      id: t.id,
      date_worked: t.date_worked || "",
      task_link: t.task_link || "",
      status: t.status || "",
      owner: t.owner || "",
      stage: t.stage || "",
      completed_at: t.completed_at,
      created_at: t.created_at,
      notes: t.notes || "",
      hours_spent: Number(t.hours_spent) || 0,
    }));

    setAllTasks(mapped);
    const members = [...new Set(mapped.map((t) => t.owner).filter(Boolean))];
    setTeamMembers(members);
    setLoading(false);
  }, []);

  // Filter by date range
  useEffect(() => {
    const filtered = allTasks.filter((task) => {
      if (!task.date_worked) return true;
      try {
        const taskDate = parseISO(task.date_worked);
        return isWithinInterval(taskDate, { start: dateRange.from, end: dateRange.to });
      } catch {
        return true;
      }
    });
    setTasks(filtered);
  }, [allTasks, dateRange]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const syncData = useCallback(async () => {
    setSyncing(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSyncing(false); return; }

    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-sheets-sync`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "sync" }),
      }
    );

    await fetchTasks();
    setSyncing(false);
  }, [fetchTasks]);

  return { tasks, allTasks, activeSheet, loading, syncing, syncData, fetchTasks, teamMembers };
}
