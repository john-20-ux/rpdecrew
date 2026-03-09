import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileDown, FileImage, FileText, File } from "lucide-react";
import { useFilteredTasks } from "@/hooks/useFilteredTasks";
import { toast } from "sonner";

export default function ReportsExport() {
  const tasks = useFilteredTasks();

  const exportCSV = () => {
    const headers = ["Date Worked", "Owner", "Stage", "Status", "Hours Spent", "Task Link", "Notes"];
    const rows = tasks.map((t) => [t.date_worked, t.owner, t.stage, t.status, t.hours_spent, t.task_link, t.notes]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workforce-report.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Export</h1>
        <p className="text-sm text-muted-foreground mt-1">Export your analytics data in various formats</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 text-success">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="font-semibold">Export CSV</h3>
          <p className="text-sm text-muted-foreground">Download filtered task data as a spreadsheet-compatible CSV file.</p>
          <Button onClick={exportCSV} className="w-full">
            <FileDown className="mr-2 h-4 w-4" /> Download CSV
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info/10 text-info">
            <FileImage className="h-6 w-6" />
          </div>
          <h3 className="font-semibold">Export Charts (PNG)</h3>
          <p className="text-sm text-muted-foreground">Save individual charts as PNG images for presentations.</p>
          <Button variant="outline" className="w-full" onClick={() => toast.info("PNG export coming soon with Google Sheets integration")}>
            <FileImage className="mr-2 h-4 w-4" /> Coming Soon
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <File className="h-6 w-6" />
          </div>
          <h3 className="font-semibold">Full PDF Report</h3>
          <p className="text-sm text-muted-foreground">Generate a comprehensive PDF with all dashboards and insights.</p>
          <Button variant="outline" className="w-full" onClick={() => toast.info("PDF export coming soon with Google Sheets integration")}>
            <FileDown className="mr-2 h-4 w-4" /> Coming Soon
          </Button>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          <strong>{tasks.length}</strong> tasks in current filter. Data reflects your selected date range.
        </p>
      </motion.div>
    </div>
  );
}
