// Task interface - used across the app
export interface Task {
  id: string;
  date_worked: string;
  task_link: string;
  status: "Completed" | "In Progress" | "To Do" | "Blocked" | string;
  owner: string;
  stage: string;
  completed_at: string | null;
  created_at: string;
  notes: string;
  hours_spent: number;
}
