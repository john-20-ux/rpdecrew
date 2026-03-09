import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { Button } from "@/components/ui/button";
import { Sheet, CheckCircle2, LogOut, Loader2 } from "lucide-react";

export function GoogleConnectCard() {
  const { connected, email, loading, connect, disconnect } = useGoogleAuth();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking connection...
      </div>
    );
  }

  if (connected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-muted-foreground">Connected as</span>
          <span className="font-medium">{email}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={disconnect} className="text-xs text-destructive hover:text-destructive">
          <LogOut className="h-3 w-3 mr-1" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={connect} variant="outline" size="sm" className="gap-2">
      <Sheet className="h-4 w-4" />
      Connect Google Sheets
    </Button>
  );
}
