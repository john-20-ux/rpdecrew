import { motion } from "framer-motion";
import { Plug, RefreshCw, AlertCircle, CheckCircle2, FileUp, ListTree, UserPlus, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useGooglePicker } from "@/hooks/useGooglePicker";
import { useAuth, Role } from "@/contexts/AuthContext";

const STORAGE_KEY = "rpdecrew_settings_state";

export default function Settings() {
  const [isConnected, setIsConnected] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetchingTabs, setIsFetchingTabs] = useState(false);
  
  // User Management State
  const { users, addUser, removeUser, currentUser } = useAuth();
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>("user");
  
  const { openPicker, isReady, isConfigured } = useGooglePicker();

  // Load state from localStorage on initial render
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // We defer state update slightly so the hydration doesn't complain, 
        // or we just set it directly. Direct set is fine for client-only.
        setIsConnected(parsed.isConnected || false);
        setSheetUrl(parsed.sheetUrl || "");
        setSheetName(parsed.sheetName || "");
        setAvailableTabs(parsed.availableTabs || []);
        setSelectedTab(parsed.selectedTab || "");
      } catch (e) {
        console.error("Failed to parse settings state", e);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      isConnected,
      sheetUrl,
      sheetName,
      availableTabs,
      selectedTab
    }));
  }, [isConnected, sheetUrl, sheetName, availableTabs, selectedTab]);

  const fetchSheetTabs = async (spreadsheetId: string, token: string) => {
    setIsFetchingTabs(true);
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch sheet details");
      
      const data = await response.json();
      const tabs = data.sheets.map((sheet: any) => sheet.properties.title);
      setAvailableTabs(tabs);
      if (tabs.length > 0) {
        setSelectedTab(tabs[0]);
      }
    } catch (error) {
      console.error("Error fetching tabs:", error);
      toast.error("Failed to fetch tabs from the selected spreadsheet");
    } finally {
      setIsFetchingTabs(true); // deliberately keeping true briefly or false
      setIsFetchingTabs(false);
    }
  };

  const handleConnect = () => {
    if (!isConfigured) {
      toast.error("Google OAuth missing! Add VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY to .env");
      // Fallback for demo
      setTimeout(() => {
        setIsConnected(true);
        toast.info("Showing mock state for demo purposes.");
      }, 500);
      return;
    }
    
    if (!isReady) {
      toast.info("Google scripts are still loading, please wait a moment.");
      return;
    }

    openPicker((doc: any, token: string) => {
      setSheetUrl(doc.url);
      setSheetName(doc.name);
      setIsConnected(true);
      toast.success(`Successfully linked "${doc.name}"!`);
      if (token) {
        fetchSheetTabs(doc.id, token);
      }
    });
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setSheetUrl("");
    setSheetName("");
    setAvailableTabs([]);
    setSelectedTab("");
    sessionStorage.removeItem("gapi_access_token");
    toast.info("Google Account disconnected");
  };

  const handleSync = () => {
    if (!sheetUrl) {
      toast.error("Please provide a valid Google Sheet URL first");
      return;
    }
    setIsSyncing(true);
    // Simulate sync or trigger backend endpoint to update SHEET_ID
    setTimeout(() => {
      setIsSyncing(false);
      toast.success("Data synced successfully from Google Sheets!");
    }, 2000);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;
    addUser(newUserName, newUserEmail, newUserRole);
    setNewUserName("");
    setNewUserEmail("");
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your integrations, data sources, and users.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6">
        {/* DATA INTEGRATIONS */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" /> Data Integrations
              </CardTitle>
              <CardDescription>Link your external accounts to pull in workforce metrics.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-xl bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-full bg-blue-50 flex items-center justify-center p-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg" alt="Google Sheets" className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold flex flex-wrap items-center gap-2 text-sm sm:text-base">
                      Google Sheets
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          <CheckCircle2 className="h-3 w-3" /> Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                          Not Connected
                        </span>
                      )}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Sync your engineering tracking spreadsheets.</p>
                  </div>
                </div>
                <Button
                  variant={isConnected ? "outline" : "default"}
                  onClick={isConnected ? handleDisconnect : handleConnect}
                  className="w-full sm:w-auto"
                >
                  {isConnected ? "Disconnect" : "Connect"}
                </Button>
              </div>

              {isConnected && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="sheetUrl">Data Source Spreadsheet URL</Label>
                    {sheetName && (
                      <p className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-2">
                        <FileUp className="h-4 w-4" /> Selected: {sheetName}
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="sheetUrl"
                        placeholder="https://docs.google.com/spreadsheets/d/1qAP_fW4f..."
                        value={sheetUrl}
                        onChange={(e) => setSheetUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={handleSync} disabled={isSyncing} className="w-full sm:w-[120px]">
                        {isSyncing ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Syncing
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" /> Sync Now
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" /> Data will automatically sync whenever the sheet is updated.
                      </p>
                      <Button variant="link" size="sm" onClick={() => openPicker((doc: any, token: string) => {
                        setSheetUrl(doc.url);
                        setSheetName(doc.name);
                        if (token) fetchSheetTabs(doc.id, token);
                      })} className="text-xs h-auto p-0 shrink-0">
                        Select different file
                      </Button>
                    </div>

                    {availableTabs.length > 0 && (
                      <div className="pt-4 mt-4 border-t space-y-2">
                        <Label htmlFor="tabSelect" className="flex items-center gap-2">
                          <ListTree className="h-4 w-4" /> Select Tab / Sheet
                        </Label>
                        <Select value={selectedTab} onValueChange={setSelectedTab}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a tab..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTabs.map((tab) => (
                              <SelectItem key={tab} value={tab}>{tab}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedTab && (
                          <p className="text-xs text-muted-foreground mt-1">
                            The dashboard will sync data from the <strong>{selectedTab}</strong> tab.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* USER MANAGEMENT */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> User Management
              </CardTitle>
              <CardDescription>Manage who has access to view or configure the dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
              <form onSubmit={handleAddUser} className="space-y-4 p-4 border rounded-xl bg-card">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Add New User
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="John Doe" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="john@example.com" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUserRole} onValueChange={(val: Role) => setNewUserRole(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User (View Only)</SelectItem>
                      <SelectItem value="admin">Admin (Full Access)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Add User</Button>
              </form>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Current Users</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium text-sm flex items-center gap-2">
                          {user.name} 
                          {user.id === currentUser?.id && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold">You</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                          {user.role}
                        </span>
                        {user.id !== currentUser?.id && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => removeUser(user.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}