import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useFilteredTasks } from "@/hooks/useFilteredTasks";
import { Lightbulb, TrendingUp, AlertTriangle, Zap, Loader2, RefreshCw, Database, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Insight {
  type: "info" | "warning" | "success" | "tip";
  title: string;
  description: string;
}

export default function Insights() {
  const { tasks, loading: tasksLoading, hasData } = useFilteredTasks();
  const { session } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const tasksSummary = useMemo(() => {
    if (tasks.length === 0) return null;

    const stageCounts: Record<string, number> = {};
    const ownerStats: Record<string, { tasks: number; hours: number; completed: number }> = {};

    tasks.forEach((t) => {
      stageCounts[t.stage] = (stageCounts[t.stage] || 0) + 1;
      if (!ownerStats[t.owner]) ownerStats[t.owner] = { tasks: 0, hours: 0, completed: 0 };
      ownerStats[t.owner].tasks++;
      ownerStats[t.owner].hours += t.hours_spent;
      if (t.status === "Completed") ownerStats[t.owner].completed++;
    });

    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === "Completed").length,
      totalHours: tasks.reduce((s, t) => s + t.hours_spent, 0),
      stageDistribution: stageCounts,
      memberStats: Object.entries(ownerStats).map(([name, stats]) => ({
        name,
        ...stats,
        completionRate: stats.tasks > 0 ? Math.round((stats.completed / stats.tasks) * 100) : 0,
      })),
    };
  }, [tasks]);

  const generateInsights = async () => {
    if (!tasksSummary || !session) return;
    setAiLoading(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-insights`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ tasksSummary }),
        }
      );
      const result = await resp.json();

      if (!resp.ok) {
        toast.error(result.error || "Failed to generate insights");
        return;
      }

      setInsights(result.insights || []);
      setHasGenerated(true);
      toast.success("AI insights generated!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const iconMap = {
    info: <Lightbulb className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    success: <TrendingUp className="h-4 w-4" />,
    tip: <Zap className="h-4 w-4" />,
  };

  const colorMap = {
    info: "border-info/30 bg-info/5",
    warning: "border-warning/30 bg-warning/5",
    success: "border-success/30 bg-success/5",
    tip: "border-primary/30 bg-primary/5",
  };

  const iconColorMap = {
    info: "text-info",
    warning: "text-warning",
    success: "text-success",
    tip: "text-primary",
  };

  if (tasksLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Database className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Connect a Google Sheet to generate AI insights</p>
        <Link to="/data-sources"><Button>Connect Data Source</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Insights & Recommendations</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered analysis of your team data</p>
        </div>
        <Button onClick={generateInsights} disabled={aiLoading} variant={hasGenerated ? "outline" : "default"} size="sm">
          {aiLoading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : hasGenerated ? (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          )}
          {hasGenerated ? "Regenerate" : "Generate Insights"}
        </Button>
      </motion.div>

      {!hasGenerated && !aiLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 gap-4"
        >
          <Sparkles className="h-12 w-12 text-primary/30" />
          <div className="text-center">
            <p className="font-medium">Ready to analyze your team data</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click "Generate Insights" to get AI-powered recommendations based on {tasks.length} tasks
            </p>
          </div>
        </motion.div>
      )}

      {aiLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing your team data...</p>
        </div>
      )}

      {insights.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {insights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-xl border p-5 ${colorMap[insight.type] || colorMap.info}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${iconColorMap[insight.type] || iconColorMap.info}`}>
                  {iconMap[insight.type] || iconMap.info}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{insight.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
