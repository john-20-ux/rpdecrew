import { useQuery } from "@tanstack/react-query";
import { type Task } from "@/lib/mock-data";
import { fetchEmployeeMetrics } from "@/services/googleSheets";
import { type Stage } from "@/lib/stage-colors";

const fetchTasks = async (): Promise<Task[]> => {
  const data = await fetchEmployeeMetrics();
  if (!data || data.length === 0) return [];
  
  // Filter out any rows that have empty or undefined Owners
  const validData = data.filter((row: any) => {
    const owner = (row.Owner || row.Person || "").trim();
    return owner.length > 0;
  });
  
  return validData.map((row: any, i: number) => {
    const itemLower = (row["Card Item"] || "").toLowerCase();
    
    let stage: Stage = "Feature";
    const rawStage = (row["Stage"] || "").trim();
    
    if (rawStage) {
      // Try to match the stage exactly or closely to our known STAGES
      if (rawStage.toLowerCase().includes("bug")) stage = "Bug";
      else if (rawStage.toLowerCase().includes("sync")) stage = "New Sync";
      else if (rawStage.toLowerCase().includes("feature")) stage = "Feature";
      else if (rawStage.toLowerCase().includes("edge")) stage = "Edge Cases";
      else if (rawStage.toLowerCase().includes("optimi")) stage = "Optimization";
      else if (rawStage.toLowerCase().includes("third")) stage = "Third Party";
      else if (rawStage.toLowerCase().includes("schedule")) stage = "Schedule Modifications";
      else if (rawStage.toLowerCase().includes("server")) stage = "Server Fixes";
      else if (rawStage.toLowerCase().includes("analy")) stage = "Analysis";
      else if (rawStage.toLowerCase().includes("improv")) stage = "App Improvements";
      else if (rawStage.toLowerCase().includes("ticket")) stage = "Ticket Analysis";
    } else {
      if (itemLower.includes("bug")) stage = "Bug";
      else if (itemLower.includes("sync")) stage = "New Sync";
      else if (itemLower.includes("edge")) stage = "Edge Cases";
      else if (itemLower.includes("optimi")) stage = "Optimization";
      else if (itemLower.includes("third") || itemLower.includes("3rd")) stage = "Third Party";
      else if (itemLower.includes("schedule")) stage = "Schedule Modifications";
      else if (itemLower.includes("server")) stage = "Server Fixes";
      else if (itemLower.includes("analy")) stage = "Analysis";
      else if (itemLower.includes("improv")) stage = "App Improvements";
      else if (itemLower.includes("ticket")) stage = "Ticket Analysis";
    }

    let dateStr = row["Date worked"] || row["Date Worked"] || row.Date;
    let parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) {
      parsedDate = new Date();
    }
    
    let compDateStr = row["Completed AT"] || row["Completed At"] || dateStr;
    let parsedCompDate = new Date(compDateStr);
    if (isNaN(parsedCompDate.getTime())) {
      parsedCompDate = new Date();
    }

    let createdDateStr = row["Created At"] || dateStr;
    let parsedCreatedDate = new Date(createdDateStr);
    if (isNaN(parsedCreatedDate.getTime())) {
      parsedCreatedDate = new Date();
    }
    
    const owner = row.Owner || row.Person || "Unknown";
    const notes = [
      row["Card Item"] ? `Item: ${row["Card Item"]}` : "",
      row.Notes ? `Notes: ${row.Notes}` : ""
    ].filter(Boolean).join(" | ");

    return {
      id: `gsheet-task-${i}`,
      date_worked: parsedDate.toISOString(),
      task_link: row.Links || "",
      status: row.Status || "Completed",
      owner: owner.trim(),
      stage,
      completed_at: parsedCompDate.toISOString(),
      created_at: parsedCreatedDate.toISOString(),
      notes,
      hours_spent: parseFloat(row["Hours Spent"]) || parseFloat(row.Hours) || 0
    };
  });
};

export function useTasksData() {
  return useQuery({
    queryKey: ["employeeMetrics"],
    queryFn: fetchTasks,
    staleTime: 5 * 60 * 1000,
  });
}
