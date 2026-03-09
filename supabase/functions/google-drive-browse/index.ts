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

  // Check if token is expired
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
    return new Response(JSON.stringify({ error: "Google not connected or token expired" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { folderId } = await req.json();

  try {
    // List folders and spreadsheets in the given folder (or root)
    let query = "mimeType='application/vnd.google-apps.folder' or mimeType='application/vnd.google-apps.spreadsheet'";
    if (folderId) {
      query = `'${folderId}' in parents and (${query})`;
    } else {
      query = `'root' in parents and (${query})`;
    }

    const params = new URLSearchParams({
      q: query,
      fields: "files(id,name,mimeType,modifiedTime,iconLink)",
      orderBy: "folder,name",
      pageSize: "100",
    });

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();
    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      type: f.mimeType === "application/vnd.google-apps.folder" ? "folder" : "spreadsheet",
      modifiedTime: f.modifiedTime,
    }));

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
