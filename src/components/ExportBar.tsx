import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileText, FileImage, File, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportChartAsPNG, exportDashboardAsPDF } from "@/lib/export-utils";
import { type Task } from "@/lib/mock-data";

interface ExportBarProps {
  tasks: Task[];
  chartIds?: { id: string; label: string }[];
}

export function ExportBar({ tasks, chartIds = [] }: ExportBarProps) {
  const [loading, setLoading] = useState<string | null>(null);

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
    toast.success("CSV exported");
  };

  const handlePNG = async (chartId: string, label: string) => {
    setLoading("png");
    try {
      await exportChartAsPNG(chartId, label.toLowerCase().replace(/\s+/g, "-"));
      toast.success(`"${label}" exported as PNG`);
    } catch {
      toast.error("Chart not found on this page");
    } finally {
      setLoading(null);
    }
  };

  const handlePDF = async () => {
    setLoading("pdf");
    toast.info("Generating PDF...");
    try {
      await new Promise((r) => setTimeout(r, 100));
      await exportDashboardAsPDF("workforce-report");
      toast.success("PDF downloaded");
    } catch {
      toast.error("PDF generation failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCSV}>
          <FileText className="mr-2 h-4 w-4" /> Export CSV
        </DropdownMenuItem>
        {chartIds.map((c) => (
          <DropdownMenuItem key={c.id} onClick={() => handlePNG(c.id, c.label)}>
            <FileImage className="mr-2 h-4 w-4" /> {c.label} (PNG)
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={handlePDF}>
          <File className="mr-2 h-4 w-4" /> Full Page PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
