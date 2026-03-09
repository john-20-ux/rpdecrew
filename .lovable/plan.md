
# Team Workforce Analytics Platform

## Phase 1: Core UI & Layout
- **Sidebar navigation** with routes: Dashboard, Team Performance, Stage Analytics, Individual Reports, Insights, Reports Export
- **Top bar** with global date filter (Today, Yesterday, Last 7/10/30/90 Days, Last Month/Quarter/Year, YTD/MTD/QTD, Custom Range), search, and user profile
- **Dark/light mode toggle** with smooth transitions
- **Loading skeletons** for all data sections

## Phase 2: Database & Google Sheets Sync
- **Lovable Cloud database** with tables: `tasks` (date_worked, task_link, status, owner, stage, completed_at, created_at, notes, hours_spent), `stages` (stage_name), `sync_logs` (status, timestamp, rows_synced)
- **Edge function** to connect to Google Sheets API, parse rows, upsert into tasks table, prevent duplicates via task_link + date_worked composite key
- **Scheduled sync** every 10 minutes via edge function with sync status logging
- All 11 stage categories pre-seeded

## Phase 3: Main Dashboard
- **KPI cards**: Total Tasks, Completed Tasks, Total Hours, Avg Hours/Task, Completion Rate, Active Members — each with trend indicator and period comparison
- **Overview charts**: tasks over time (line), stage distribution (pie), recent activity feed

## Phase 4: Team Performance Analytics (Priority)
- **Per-member metrics table**: tasks worked, completed, hours, avg hours/task, completion rate, top stage
- **Bar chart**: tasks completed by person
- **Stacked bar chart**: stage workload distribution per person
- **Leaderboard**: ranked top performers with key metrics
- All charts respond to global date filter with hover tooltips and animations

## Phase 5: Stage Analytics
- **Pie chart**: task distribution across stages
- **Bar chart**: total hours per stage
- **Line chart**: stage trends over time
- Metrics: total tasks, total hours, avg completion time per stage

## Phase 6: Individual Performance Pages
- **Profile page per team member** (navigable from team performance)
- **Line chart**: tasks completed over time
- **Bar chart**: hours per stage
- **Pie chart**: personal stage distribution
- Summary stats: total tasks, hours, completion trends

## Phase 7: AI Insights & Recommendations
- **Rule-based engine**: detect % changes (e.g., "Bug tasks up 18%"), identify workload imbalances, spot top performers per stage
- **Lovable AI (Gemini)**: generate narrative team and individual insights from aggregated data via edge function
- **Insights panel** on dashboard and individual pages
- **Recommendations panel**: workload rebalancing suggestions, overload alerts, optimization tips

## Phase 8: Export & Reporting
- **CSV export** for filtered data tables
- **PNG export** for individual charts (html2canvas)
- **PDF export** for full dashboard reports (jsPDF)
- "Export Full Report" button combining all sections

## Design
- Professional analytics aesthetic inspired by Linear/Datadog
- Consistent color palette for stages across all charts
- Recharts for all visualizations with smooth animations
- Responsive layout with collapsible sidebar
