export const STAGES = [
  "Bug",
  "New Sync",
  "Feature",
  "Edge Cases",
  "Optimization",
  "Third Party",
  "Schedule Modifications",
  "Server Fixes",
  "Analysis",
  "App Improvements",
  "Ticket Analysis",
] as const;

export type Stage = typeof STAGES[number];

export const STAGE_COLORS: Record<Stage, string> = {
  "Bug": "hsl(0, 84%, 60%)",
  "New Sync": "hsl(199, 89%, 48%)",
  "Feature": "hsl(221, 83%, 53%)",
  "Edge Cases": "hsl(38, 92%, 50%)",
  "Optimization": "hsl(142, 71%, 45%)",
  "Third Party": "hsl(262, 83%, 58%)",
  "Schedule Modifications": "hsl(328, 81%, 65%)",
  "Server Fixes": "hsl(15, 75%, 50%)",
  "Analysis": "hsl(172, 66%, 50%)",
  "App Improvements": "hsl(250, 60%, 55%)",
  "Ticket Analysis": "hsl(200, 15%, 46%)",
};

export const STAGE_SHORT_LABELS: Record<Stage, string> = {
  "Bug": "Bug",
  "New Sync": "Sync",
  "Feature": "Feature",
  "Edge Cases": "Edge Cases",
  "Optimization": "Optimize",
  "Third Party": "3rd Party",
  "Schedule Modifications": "Schedule",
  "Server Fixes": "Server",
  "Analysis": "Analysis",
  "App Improvements": "App Improv.",
  "Ticket Analysis": "Ticket",
};
