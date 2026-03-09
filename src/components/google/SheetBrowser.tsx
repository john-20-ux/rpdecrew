import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderOpen, FileSpreadsheet, ChevronRight, ArrowLeft, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface DriveItem {
  id: string;
  name: string;
  type: "folder" | "spreadsheet";
  modifiedTime: string;
}

interface SheetTab {
  title: string;
  sheetId: number;
  rowCount: number;
}

interface SheetBrowserProps {
  onSheetConnected: () => void;
}

export function SheetBrowser({ onSheetConnected }: SheetBrowserProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [folderStack, setFolderStack] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "My Drive" }]);
  const [sheetTabs, setSheetTabs] = useState<SheetTab[]>([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<DriveItem | null>(null);
  const [connecting, setConnecting] = useState(false);

  const browse = useCallback(async (folderId: string | null) => {
    setLoading(true);
    setSheetTabs([]);
    setSelectedSpreadsheet(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-browse`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ folderId }),
        }
      );
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      toast.error("Failed to browse Drive");
    }
    setLoading(false);
  }, []);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setFolderStack([{ id: null, name: "My Drive" }]);
    browse(null);
  }, [browse]);

  const openFolder = (item: DriveItem) => {
    setFolderStack((prev) => [...prev, { id: item.id, name: item.name }]);
    browse(item.id);
  };

  const goBack = () => {
    if (folderStack.length <= 1) return;
    const newStack = folderStack.slice(0, -1);
    setFolderStack(newStack);
    browse(newStack[newStack.length - 1].id);
  };

  const selectSpreadsheet = async (item: DriveItem) => {
    setSelectedSpreadsheet(item);
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-sheets-sync`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "list-sheets", spreadsheetId: item.id }),
        }
      );
      const data = await res.json();
      setSheetTabs(data.sheets || []);
    } catch {
      toast.error("Failed to load sheet tabs");
    }
    setLoading(false);
  };

  const connectSheet = async (sheetName: string) => {
    if (!selectedSpreadsheet) return;
    setConnecting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const folderPath = folderStack.map((f) => f.name).join(" / ");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-sheets-sync`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "connect",
            spreadsheetId: selectedSpreadsheet.id,
            spreadsheetName: selectedSpreadsheet.name,
            sheetName,
            folderPath,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(`Connected! ${data.rowsImported} rows imported.`);
        setOpen(false);
        onSheetConnected();
      } else {
        toast.error(data.error || "Failed to connect sheet");
      }
    } catch {
      toast.error("Failed to connect sheet");
    }
    setConnecting(false);
  };

  const currentFolder = folderStack[folderStack.length - 1];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleOpen}>
          <FolderOpen className="h-4 w-4" />
          Choose Sheet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-base">
            {selectedSpreadsheet ? `Select tab from "${selectedSpreadsheet.name}"` : "Browse Google Drive"}
          </DialogTitle>
        </DialogHeader>

        {/* Breadcrumb */}
        {!selectedSpreadsheet && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto pb-2">
            {folderStack.map((f, i) => (
              <span key={i} className="flex items-center gap-1 whitespace-nowrap">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                {f.name}
              </span>
            ))}
          </div>
        )}

        {/* Back button */}
        {(folderStack.length > 1 || selectedSpreadsheet) && (
          <Button
            variant="ghost"
            size="sm"
            className="w-fit text-xs mb-1"
            onClick={() => {
              if (selectedSpreadsheet) {
                setSelectedSpreadsheet(null);
                setSheetTabs([]);
              } else {
                goBack();
              }
            }}
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Back
          </Button>
        )}

        {/* Content */}
        <div className="space-y-1 max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading...
            </div>
          ) : selectedSpreadsheet ? (
            // Sheet tabs
            sheetTabs.map((tab) => (
              <button
                key={tab.sheetId}
                onClick={() => connectSheet(tab.title)}
                disabled={connecting}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{tab.title}</p>
                  <p className="text-xs text-muted-foreground">{tab.rowCount} rows</p>
                </div>
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                ) : (
                  <Check className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
            ))
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No folders or spreadsheets found</p>
          ) : (
            // Drive items
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => item.type === "folder" ? openFolder(item) : selectSpreadsheet(item)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
              >
                {item.type === "folder" ? (
                  <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                </div>
                {item.type === "folder" && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
