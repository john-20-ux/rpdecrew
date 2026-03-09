import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  // Step 1: Generate auth URL
  if (action === "authorize") {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-auth?action=callback`;
    
    // Get user from token to pass as state
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response("Invalid token", { status: 401 });

    const state = btoa(JSON.stringify({ userId: user.id, token: authHeader.replace("Bearer ", "") }));

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return new Response(JSON.stringify({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Step 2: OAuth callback
  if (action === "callback") {
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    
    if (!code || !stateParam) {
      return new Response("Missing code or state", { status: 400 });
    }

    const { userId } = JSON.parse(atob(stateParam));
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-auth?action=callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (tokens.error) {
      return new Response(`<html><body><script>window.opener?.postMessage({type:'google-auth-error',error:'${tokens.error}'},'*');window.close();</script></body></html>`, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Get user email
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    // Store tokens
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    await supabase.from("google_connections").upsert({
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: expiresAt,
      email: userInfo.email,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // Close popup and notify parent
    return new Response(`<html><body><script>window.opener?.postMessage({type:'google-auth-success',email:'${userInfo.email}'},'*');window.close();</script></body></html>`, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // Step 3: Refresh token
  if (action === "refresh") {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response("Invalid token", { status: 401 });

    const { data: conn } = await supabase.from("google_connections").select("*").eq("user_id", user.id).single();
    if (!conn?.refresh_token) {
      return new Response(JSON.stringify({ error: "No refresh token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
    if (tokens.error) {
      return new Response(JSON.stringify({ error: tokens.error }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
    await supabase.from("google_connections").update({
      access_token: tokens.access_token,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Step 4: Check connection status
  if (action === "status") {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response("Invalid token", { status: 401 });

    const { data: conn } = await supabase.from("google_connections").select("email, token_expires_at").eq("user_id", user.id).single();

    return new Response(JSON.stringify({ connected: !!conn, email: conn?.email || null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Step 5: Disconnect
  if (action === "disconnect") {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response("Invalid token", { status: 401 });

    await supabase.from("google_connections").delete().eq("user_id", user.id);
    await supabase.from("sheet_tasks").delete().eq("user_id", user.id);
    await supabase.from("connected_sheets").delete().eq("user_id", user.id);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response("Unknown action", { status: 400, headers: corsHeaders });
});
