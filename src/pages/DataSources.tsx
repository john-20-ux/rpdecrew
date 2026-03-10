import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Link2, Unlink, FolderOpen, FileSpreadsheet, ChevronRight,
  ArrowLeft, RefreshCw, Loader2, CheckCircle2, Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DriveFile {
  id: string;
  name: string;
  isFolder: boolean;
  modifiedTime: string;
}

interface SheetTab {
  title: string;
  index: number;
}

interface ConnectedSheet {
  id: string;
  spreadsheet_id: string;
  spreadsheet_name: string;
  sheet_name: string | null;
  last_synced_at: string | null;
  is_active: boolean;
}

export default function DataSources() {
  const { session } = useAuth();
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Drive browser state
  const [browsing, setBrowsing] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folderStack, setFolderStack] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "My Drive" },
  ]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Sheet selection state
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<DriveFile | null>(null);
  const [sheetTabs, setSheetTabs] = useState<SheetTab[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [selectedTab, setSelectedTab] = useState<string>("Sheet1");

  // Connected sheets
  const [connectedSheets, setConnectedSheets] = useState<ConnectedSheet[]>([]);

  const checkConnection = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("google_connections")
      .select("email")
      .single();

    setGoogleEmail(data?.email || null);
    setLoading(false);
  }, [session]);

  const loadConnectedSheets = useCallback(async () => {
    const { data } = await supabase
      .from("connected_sheets")
      .select("*")
      .eq("is_active", true);
    setConnectedSheets((data as ConnectedSheet[]) || []);
  }, []);

  useEffect(() => {
    checkConnection();
    loadConnectedSheets();
  }, [checkConnection, loadConnectedSheets]);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code && session) {
      handleOAuthCallback(code);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [session]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/data-sources`;
      const { data, error } = await supabase.functions.invoke("google-auth", {
        body: { redirectUri },
        headers: { "x-action": "true" },
      });

      // Use query param approach
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-auth?action=initiate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ redirectUri }),
        }
      );
      const result = await resp.json();
      if (result.authUrl) {
        window.location.href = result.authUrl;
      } else {
        toast.error("Failed to start Google connection");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    try {
      const redirectUri = `${window.location.origin}/data-sources`;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-auth?action=callback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ code, redirectUri }),
        }
      );
      const result = await resp.json();
      if (result.success) {
        setGoogleEmail(result.email);
        toast.success(`Connected as ${result.email}`);
      } else {
        toast.error(result.error || "Connection failed");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-auth?action=disconnect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );
      setGoogleEmail(null);
      setConnectedSheets([]);
      toast.success("Google account disconnected");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const browseDrive = async (folderId: string | null) => {
    setLoadingFiles(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ folderId }),
        }
      );
      const result = await resp.json();
      setFiles(result.files || []);
    } catch (e: any) {
      toast.error("Failed to browse Drive");
    } finally {
      setLoadingFiles(false);
    }
  };

  const openBrowser = () => {
    setBrowsing(true);
    setFolderStack([{ id: null, name: "My Drive" }]);
    browseDrive(null);
  };

  const enterFolder = (file: DriveFile) => {
    setFolderStack((s) => [...s, { id: file.id, name: file.name }]);
    browseDrive(file.id);
  };

  const goBack = () => {
    if (folderStack.length <= 1) return;
    const newStack = folderStack.slice(0, -1);
    setFolderStack(newStack);
    browseDrive(newStack[newStack.length - 1].id);
  };

  const selectSpreadsheet = async (file: DriveFile) => {
    setSelectedSpreadsheet(file);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-sheets-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: "list-sheets", spreadsheetId: file.id }),
        }
      );
      const result = await resp.json();
      setSheetTabs(result.sheets || []);
      if (result.sheets?.length > 0) {
        setSelectedTab(result.sheets[0].title);
        previewSheet(file.id, result.sheets[0].title);
      }
    } catch (e: any) {
      toast.error("Failed to load sheet tabs");
    }
  };

  const previewSheet = async (spreadsheetId: string, sheetName: string) => {
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-sheets-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: "preview", spreadsheetId, sheetName }),
        }
      );
      const result = await resp.json();
      setPreviewRows(result.rows || []);
    } catch {
      setPreviewRows([]);
    }
  };

  const connectSheet = async () => {
    if (!selectedSpreadsheet) return;
    setSyncing(true);
    try {
      const folderPath = folderStack.map((f) => f.name).join(" / ");
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-sheets-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            action: "connect",
            spreadsheetId: selectedSpreadsheet.id,
            spreadsheetName: selectedSpreadsheet.name,
            sheetName: selectedTab,
            folderPath,
          }),
        }
      );
      const result = await resp.json();
      if (result.success) {
        toast.success("Sheet connected and synced!");
        setBrowsing(false);
        setSelectedSpreadsheet(null);
        setPreviewRows([]);
        loadConnectedSheets();
      } else {
        toast.error(result.error || "Failed to connect sheet");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-sheets-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: "sync" }),
        }
      );
      const result = await resp.json();
      if (result.success) {
        toast.success(`Synced ${result.synced} tasks`);
        loadConnectedSheets();
      } else {
        toast.error(result.error || "Sync failed");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold tracking-tight">Data Sources</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect Google Sheets to power your dashboards with live data
        </p>
      </motion.div>

      {/* Google Connection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm">Google Account</p>
              {googleEmail ? (
                <p className="text-xs text-muted-foreground">Connected as {googleEmail}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Not connected</p>
              )}
            </div>
          </div>
          {googleEmail ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openBrowser}>
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Add Sheet
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDisconnect}>
                <Unlink className="mr-1.5 h-3.5 w-3.5" /> Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Link2 className="mr-1.5 h-3.5 w-3.5" />}
              Connect Google
            </Button>
          )}
        </div>
      </motion.div>

      {/* Drive Browser */}
      {browsing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-6 space-y-4"
        >
          {!selectedSpreadsheet ? (
            <>
              <div className="flex items-center gap-2">
                {folderStack.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  {folderStack.map((f, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight className="h-3 w-3" />}
                      <span className={i === folderStack.length - 1 ? "text-foreground font-medium" : ""}>
                        {f.name}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {loadingFiles ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : files.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No spreadsheets or folders found here</p>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border">
                  {files.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => file.isFolder ? enterFolder(file) : selectSpreadsheet(file)}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                    >
                      {file.isFolder ? (
                        <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />
                      )}
                      <span className="text-sm truncate flex-1">{file.name}</span>
                      {file.isFolder && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setBrowsing(false)}>Cancel</Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedSpreadsheet(null); setPreviewRows([]); }}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{selectedSpreadsheet.name}</span>
              </div>

              {sheetTabs.length > 1 && (
                <div className="flex gap-1.5 flex-wrap">
                  {sheetTabs.map((tab) => (
                    <Button
                      key={tab.title}
                      variant={selectedTab === tab.title ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        setSelectedTab(tab.title);
                        previewSheet(selectedSpreadsheet.id, tab.title);
                      }}
                    >
                      {tab.title}
                    </Button>
                  ))}
                </div>
              )}

              {previewRows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        {previewRows[0]?.map((h, i) => (
                          <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(1).map((row, ri) => (
                        <tr key={ri} className="border-t border-border">
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-3 py-2 whitespace-nowrap">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setSelectedSpreadsheet(null); setPreviewRows([]); }}>
                  Back
                </Button>
                <Button size="sm" onClick={connectSheet} disabled={syncing}>
                  {syncing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                  Connect & Sync
                </Button>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Connected Sheets */}
      {connectedSheets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Connected Sheets</h2>
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
              Sync All
            </Button>
          </div>
          {connectedSheets.map((sheet) => (
            <div key={sheet.id} className="flex items-center gap-3 rounded-lg border border-border p-4">
              <FileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{sheet.spreadsheet_name}</p>
                <p className="text-xs text-muted-foreground">
                  Tab: {sheet.sheet_name} · Last synced:{" "}
                  {sheet.last_synced_at
                    ? formatDistanceToNow(new Date(sheet.last_synced_at), { addSuffix: true })
                    : "Never"}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Active
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Empty state */}
      {!googleEmail && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center py-16 text-muted-foreground"
        >
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">Connect your Google account to import data from Google Sheets</p>
          <p className="text-xs mt-1">Your dashboards will update automatically with live data</p>
        </motion.div>
      )}
    </div>
  );
}
