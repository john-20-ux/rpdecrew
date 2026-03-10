import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileDown, FileImage, FileText, File, Loader2 } from "lucide-react";
import { useFilteredTasks } from "@/hooks/useFilteredTasks";
import { toast } from "sonner";
import { exportChartAsPNG, exportDashboardAsPDF } from "@/lib/export-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

const EXPORTABLE_CHARTS = [
  { id: "tasks-over-time", label: "Tasks Over Time", page: "/" },
  { id: "stage-distribution", label: "Stage Distribution", page: "/" },
];

export default function ReportsExport() {
  const tasks = useFilteredTasks();
  const navigate = useNavigate();
  const [selectedChart, setSelectedChart] = useState(EXPORTABLE_CHARTS[0].id);
  const [pngLoading, setPngLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

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

  const handlePNGExport = async () => {
    const chart = EXPORTABLE_CHARTS.find((c) => c.id === selectedChart);
    if (!chart) return;

    // Navigate to the page with the chart first
    if (window.location.pathname !== chart.page) {
      toast.info(`Navigate to the Dashboard page first to export "${chart.label}"`, { duration: 4000 });
      navigate(chart.page);
      return;
    }

    setPngLoading(true);
    try {
      await exportChartAsPNG(chart.id, chart.label.toLowerCase().replace(/\s+/g, "-"));
      toast.success(`"${chart.label}" exported as PNG`);
    } catch (err) {
      toast.error(`Export failed: chart not found on current page. Navigate to Dashboard first.`);
    } finally {
      setPngLoading(false);
    }
  };

  const handlePDFExport = async () => {
    setPdfLoading(true);
    toast.info("Generating PDF report...");
    try {
      // Small delay to allow toast to render
      await new Promise((r) => setTimeout(r, 100));
      await exportDashboardAsPDF("workforce-analytics-report");
      toast.success("PDF report downloaded");
    } catch (err) {
      toast.error("PDF generation failed");
      console.error(err);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Export</h1>
        <p className="text-sm text-muted-foreground mt-1">Export your analytics data in various formats</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CSV */}
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

        {/* PNG */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info/10 text-info">
            <FileImage className="h-6 w-6" />
          </div>
          <h3 className="font-semibold">Export Chart (PNG)</h3>
          <p className="text-sm text-muted-foreground">Select a chart and save it as a high-res PNG image.</p>
          <Select value={selectedChart} onValueChange={setSelectedChart}>
            <SelectTrigger className="w-full text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPORTABLE_CHARTS.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="w-full" onClick={handlePNGExport} disabled={pngLoading}>
            {pngLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileImage className="mr-2 h-4 w-4" />}
            Export PNG
          </Button>
        </motion.div>

        {/* PDF */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <File className="h-6 w-6" />
          </div>
          <h3 className="font-semibold">Full PDF Report</h3>
          <p className="text-sm text-muted-foreground">Capture the current page view as a multi-page PDF report.</p>
          <Button variant="outline" className="w-full" onClick={handlePDFExport} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          <strong>{tasks.length}</strong> tasks in current filter. <strong>Tip:</strong> Navigate to Dashboard first, then return here to export charts as PNG. PDF captures whatever page you're currently viewing.
        </p>
      </motion.div>
    </div>
  );
}
