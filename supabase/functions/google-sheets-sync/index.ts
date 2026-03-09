import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

async function getValidAccessToken(userId: string, supabase: any): Promise<string | null> {
  const { data: conn } = await supabase.from("google_connections").select("*").eq("user_id", userId).single();
  if (!conn) return null;

  if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
    if (!conn.refresh_token) return null;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: conn.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) return null;
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
    await supabase.from("google_connections").update({
      access_token: tokens.access_token,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    return tokens.access_token;
  }
  return conn.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) return new Response("Invalid token", { status: 401, headers: corsHeaders });

  const accessToken = await getValidAccessToken(user.id, supabase);
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Google not connected" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { action } = body;

  // List sheets in a spreadsheet
  if (action === "list-sheets") {
    const { spreadsheetId } = body;
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sheets = (data.sheets || []).map((s: any) => ({
      title: s.properties.title,
      sheetId: s.properties.sheetId,
      rowCount: s.properties.gridProperties?.rowCount,
    }));
    return new Response(JSON.stringify({ sheets }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Connect a sheet and sync data
  if (action === "connect") {
    const { spreadsheetId, spreadsheetName, sheetName, folderPath } = body;

    // Deactivate previous sheets
    await supabase.from("connected_sheets").update({ is_active: false }).eq("user_id", user.id);

    // Insert new connection
    const { data: sheet, error: insertErr } = await supabase.from("connected_sheets").insert({
      user_id: user.id,
      spreadsheet_id: spreadsheetId,
      spreadsheet_name: spreadsheetName,
      sheet_name: sheetName || "Sheet1",
      folder_path: folderPath,
      is_active: true,
    }).select().single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sync the data
    const syncResult = await syncSheetData(accessToken, supabase, user.id, sheet.id, spreadsheetId, sheetName || "Sheet1");

    return new Response(JSON.stringify({ success: true, sheetId: sheet.id, ...syncResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Re-sync data
  if (action === "sync") {
    const { data: activeSheet } = await supabase
      .from("connected_sheets")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!activeSheet) {
      return new Response(JSON.stringify({ error: "No active sheet" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const syncResult = await syncSheetData(
      accessToken, supabase, user.id, activeSheet.id,
      activeSheet.spreadsheet_id, activeSheet.sheet_name || "Sheet1"
    );

    await supabase.from("connected_sheets").update({ last_synced_at: new Date().toISOString() }).eq("id", activeSheet.id);

    return new Response(JSON.stringify({ success: true, ...syncResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get active sheet info
  if (action === "active-sheet") {
    const { data: activeSheet } = await supabase
      .from("connected_sheets")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    return new Response(JSON.stringify({ sheet: activeSheet }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("Unknown action", { status: 400, headers: corsHeaders });
});

async function syncSheetData(
  accessToken: string, supabase: any, userId: string,
  sheetId: string, spreadsheetId: string, sheetName: string
) {
  // Fetch all data from the sheet
  const range = encodeURIComponent(sheetName);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await res.json();
  if (data.error) return { error: data.error.message, rowsImported: 0 };

  const rows = data.values || [];
  if (rows.length < 2) return { rowsImported: 0 };

  // First row is headers
  const headers = rows[0].map((h: string) => h.toLowerCase().trim().replace(/\s+/g, "_"));
  const dataRows = rows.slice(1);

  // Delete existing tasks for this sheet
  await supabase.from("sheet_tasks").delete().eq("sheet_id", sheetId);

  // Map columns to our schema
  const tasks = dataRows.map((row: string[]) => {
    const rawRow: Record<string, string> = {};
    headers.forEach((h: string, i: number) => { rawRow[h] = row[i] || ""; });

    return {
      sheet_id: sheetId,
      user_id: userId,
      date_worked: parseDate(rawRow.date_worked || rawRow.date || rawRow.date_completed || ""),
      task_link: rawRow.task_link || rawRow.link || rawRow.url || "",
      status: rawRow.status || "",
      owner: rawRow.owner || rawRow.assignee || rawRow.assigned_to || rawRow.name || "",
      stage: rawRow.stage || rawRow.category || rawRow.type || "",
      completed_at: parseDate(rawRow.completed_at || rawRow.completed_date || ""),
      notes: rawRow.notes || rawRow.description || rawRow.comment || "",
      hours_spent: parseFloat(rawRow.hours_spent || rawRow.hours || rawRow.time_spent || "0") || 0,
      raw_row: rawRow,
    };
  }).filter((t: any) => t.owner || t.status || t.stage); // Filter empty rows

  // Insert in batches
  const batchSize = 100;
  let imported = 0;
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const { error } = await supabase.from("sheet_tasks").insert(batch);
    if (!error) imported += batch.length;
  }

  return { rowsImported: imported, totalRows: tasks.length, headers };
}

function parseDate(val: string): string | null {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}
