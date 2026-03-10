import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAccessToken(userId: string): Promise<string> {
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: conn } = await serviceClient
    .from("google_connections")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!conn) throw new Error("No Google connection found");

  if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
    const refreshResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        refresh_token: conn.refresh_token!,
        grant_type: "refresh_token",
      }),
    });
    const refreshData = await refreshResp.json();
    if (!refreshResp.ok) throw new Error("Token refresh failed");

    const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
    await serviceClient.from("google_connections").update({
      access_token: refreshData.access_token,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    return refreshData.access_token;
  }

  return conn.access_token;
}

function parseSheetRow(headers: string[], row: string[]): Record<string, any> {
  const obj: Record<string, any> = {};
  headers.forEach((h, i) => {
    obj[h.toLowerCase().trim().replace(/\s+/g, "_")] = row[i] || "";
  });
  return obj;
}

function mapToTask(raw: Record<string, any>, sheetId: string, userId: string) {
  // Flexible column mapping - tries common names
  const dateWorked = raw.date_worked || raw.date || raw.day || null;
  const owner = raw.owner || raw.assigned_to || raw.assignee || raw.person || raw.name || null;
  const stage = raw.stage || raw.category || raw.type || null;
  const status = raw.status || null;
  const hoursSpent = parseFloat(raw.hours_spent || raw.hours || raw.time || "0") || 0;
  const taskLink = raw.task_link || raw.link || raw.url || null;
  const notes = raw.notes || raw.description || raw.comment || null;

  return {
    sheet_id: sheetId,
    user_id: userId,
    date_worked: dateWorked || null,
    owner,
    stage,
    status,
    hours_spent: hoursSpent,
    task_link: taskLink,
    notes,
    raw_row: raw,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { action, spreadsheetId, sheetName, spreadsheetName, folderPath } = await req.json();
    const accessToken = await getAccessToken(userId);
    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "list-sheets") {
      // List sheet tabs in a spreadsheet
      const resp = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await resp.json();
      if (!resp.ok) {
        return new Response(JSON.stringify({ error: "Failed to list sheets" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const sheets = (data.sheets || []).map((s: any) => ({
        title: s.properties.title,
        index: s.properties.index,
      }));
      return new Response(JSON.stringify({ sheets }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "preview") {
      // Preview first 5 rows
      const range = `${sheetName || "Sheet1"}!A1:Z5`;
      const resp = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await resp.json();
      if (!resp.ok) {
        return new Response(JSON.stringify({ error: "Failed to preview sheet" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ rows: data.values || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "connect") {
      // Connect a sheet and sync its data
      // 1. Upsert connected_sheets record
      const { data: sheet, error: sheetErr } = await serviceClient
        .from("connected_sheets")
        .upsert({
          user_id: userId,
          spreadsheet_id: spreadsheetId,
          spreadsheet_name: spreadsheetName || "Untitled",
          sheet_name: sheetName || "Sheet1",
          folder_path: folderPath || null,
          is_active: true,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: "id" })
        .select()
        .single();

      if (sheetErr) {
        // Try insert instead
        const { data: newSheet, error: insertErr } = await serviceClient
          .from("connected_sheets")
          .insert({
            user_id: userId,
            spreadsheet_id: spreadsheetId,
            spreadsheet_name: spreadsheetName || "Untitled",
            sheet_name: sheetName || "Sheet1",
            folder_path: folderPath || null,
            is_active: true,
            last_synced_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertErr) {
          console.error("Insert error:", insertErr);
          return new Response(JSON.stringify({ error: "Failed to connect sheet" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Sync the data
        await syncSheetData(accessToken, newSheet!.id, spreadsheetId, sheetName || "Sheet1", userId, serviceClient);

        return new Response(JSON.stringify({ success: true, sheet: newSheet }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Sync the data
      await syncSheetData(accessToken, sheet!.id, spreadsheetId, sheetName || "Sheet1", userId, serviceClient);

      return new Response(JSON.stringify({ success: true, sheet }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync") {
      // Re-sync an existing connected sheet
      const { data: sheets } = await serviceClient
        .from("connected_sheets")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (!sheets || sheets.length === 0) {
        return new Response(JSON.stringify({ error: "No connected sheets" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let totalSynced = 0;
      for (const s of sheets) {
        const count = await syncSheetData(accessToken, s.id, s.spreadsheet_id, s.sheet_name || "Sheet1", userId, serviceClient);
        totalSynced += count;
      }

      return new Response(JSON.stringify({ success: true, synced: totalSynced }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("google-sheets-sync error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function syncSheetData(
  accessToken: string,
  sheetDbId: string,
  spreadsheetId: string,
  sheetName: string,
  userId: string,
  serviceClient: any
): Promise<number> {
  const range = `${sheetName}!A1:Z10000`;
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await resp.json();
  if (!resp.ok) throw new Error("Failed to read sheet data");

  const rows = data.values || [];
  if (rows.length < 2) return 0;

  const headers = rows[0] as string[];
  const dataRows = rows.slice(1) as string[][];

  // Delete old tasks for this sheet
  await serviceClient.from("sheet_tasks").delete().eq("sheet_id", sheetDbId);

  // Insert new tasks in batches
  const tasks = dataRows.map((row) => mapToTask(parseSheetRow(headers, row), sheetDbId, userId));
  const batchSize = 500;
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const { error } = await serviceClient.from("sheet_tasks").insert(batch);
    if (error) console.error("Batch insert error:", error);
  }

  // Update last synced
  await serviceClient.from("connected_sheets").update({
    last_synced_at: new Date().toISOString(),
  }).eq("id", sheetDbId);

  return tasks.length;
}
