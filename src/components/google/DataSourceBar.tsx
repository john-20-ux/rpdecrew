import { GoogleConnectCard } from "./GoogleConnectCard";
import { SheetBrowser } from "./SheetBrowser";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileSpreadsheet, Loader2 } from "lucide-react";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";

interface DataSourceBarProps {
  activeSheet: { spreadsheet_name: string; sheet_name: string; last_synced_at: string | null } | null;
  syncing: boolean;
  onSync: () => void;
  onSheetConnected: () => void;
}

export function DataSourceBar({ activeSheet, syncing, onSync, onSheetConnected }: DataSourceBarProps) {
  const { connected } = useGoogleAuth();

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileSpreadsheet className="h-4 w-4 text-green-600" />
        Data Source
      </div>

      <div className="h-5 w-px bg-border" />

      <GoogleConnectCard />

      {connected && (
        <>
          <div className="h-5 w-px bg-border" />
          <SheetBrowser onSheetConnected={onSheetConnected} />

          {activeSheet && (
            <>
              <div className="h-5 w-px bg-border" />
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{activeSheet.spreadsheet_name}</span>
                {" → "}
                {activeSheet.sheet_name}
                {activeSheet.last_synced_at && (
                  <span className="ml-2">
                    (synced {new Date(activeSheet.last_synced_at).toLocaleString()})
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={onSync} disabled={syncing} className="text-xs gap-1">
                {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Sync
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
