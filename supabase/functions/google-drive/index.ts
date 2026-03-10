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

  // Check if token is expired
  if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
    // Refresh token
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    const refreshResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
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

    const { folderId } = await req.json();
    const accessToken = await getAccessToken(userId);

    // List files - spreadsheets and folders only
    let query = `mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.google-apps.folder'`;
    if (folderId) {
      query = `'${folderId}' in parents and (${query})`;
    } else {
      query = `'root' in parents and (${query})`;
    }

    const driveResp = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime)&orderBy=folder,name&pageSize=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const driveData = await driveResp.json();
    if (!driveResp.ok) {
      console.error("Drive API error:", driveData);
      return new Response(JSON.stringify({ error: "Failed to list Drive files" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const files = (driveData.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      isFolder: f.mimeType === "application/vnd.google-apps.folder",
      modifiedTime: f.modifiedTime,
    }));

    return new Response(JSON.stringify({ files }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("google-drive error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
