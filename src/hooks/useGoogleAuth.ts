import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GoogleAuthState {
  connected: boolean;
  email: string | null;
  loading: boolean;
}

export function useGoogleAuth() {
  const [state, setState] = useState<GoogleAuthState>({ connected: false, email: null, loading: true });

  const checkStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState({ connected: false, email: null, loading: false });
        return;
      }

      const { data, error } = await supabase.functions.invoke("google-auth", {
        body: null,
        headers: { "Content-Type": "application/json" },
      });

      // Use query params approach via fetch
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-auth?action=status`,
        { headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const result = await res.json();
      setState({ connected: result.connected, email: result.email, loading: false });
    } catch {
      setState({ connected: false, email: null, loading: false });
    }
  }, []);

  useEffect(() => {
    checkStatus();

    const handler = (e: MessageEvent) => {
      if (e.data?.type === "google-auth-success") {
        setState({ connected: true, email: e.data.email, loading: false });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [checkStatus]);

  const connect = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-auth?action=authorize`,
      { headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
    );
    const { url } = await res.json();
    window.open(url, "google-auth", "width=500,height=700,popup=true");
  }, []);

  const disconnect = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-auth?action=disconnect`,
      { headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
    );
    setState({ connected: false, email: null, loading: false });
  }, []);

  return { ...state, connect, disconnect, refresh: checkStatus };
}
