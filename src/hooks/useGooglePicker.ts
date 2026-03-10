import { useState, useEffect } from "react";

// For development without configuring full OAuth, we'll keep a placeholder if env vars are missing
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";
const APP_ID = import.meta.env.VITE_GOOGLE_APP_ID || "";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly";

export function useGooglePicker() {
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);

  useEffect(() => {
    // Load gapi script
    const script1 = document.createElement("script");
    script1.src = "https://apis.google.com/js/api.js";
    script1.onload = () => {
      (window as any).gapi.load("picker", () => {
        setIsGapiLoaded(true);
      });
    };
    document.body.appendChild(script1);

    // Load Google Identity Services script
    const script2 = document.createElement("script");
    script2.src = "https://accounts.google.com/gsi/client";
    script2.onload = () => {
      setIsGisLoaded(true);
    };
    document.body.appendChild(script2);

    return () => {
      if (document.body.contains(script1)) document.body.removeChild(script1);
      if (document.body.contains(script2)) document.body.removeChild(script2);
    };
  }, []);

  useEffect(() => {
    if (isGisLoaded && CLIENT_ID) {
      setTokenClient(
        (window as any).google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: () => {}, // Defined later
        })
      );
    }
  }, [isGisLoaded]);

  const showPicker = (accessToken: string, onSelect: (doc: any, token: string) => void) => {
    const view = new (window as any).google.picker.DocsView((window as any).google.picker.ViewId.SPREADSHEETS);
    view.setMimeTypes("application/vnd.google-apps.spreadsheet");

    const picker = new (window as any).google.picker.PickerBuilder()
      .enableFeature((window as any).google.picker.Feature.NAV_HIDDEN)
      .enableFeature((window as any).google.picker.Feature.MULTISELECT_ENABLED)
      .setDeveloperKey(API_KEY)
      .setAppId(APP_ID)
      .setOAuthToken(accessToken)
      .addView(view)
      .setCallback((data: any) => {
        if (data[(window as any).google.picker.Response.ACTION] === (window as any).google.picker.Action.PICKED) {
          const doc = data[(window as any).google.picker.Response.DOCUMENTS][0];
          onSelect(doc, accessToken);
        }
      })
      .build();
    picker.setVisible(true);
  };

  const openPicker = (onSelect: (doc: any, token: string) => void) => {
    if (!CLIENT_ID || !API_KEY) {
      console.warn("Google API Key or Client ID is missing. Add them to .env to use the real picker.");
      return;
    }

    if (!isGapiLoaded || !isGisLoaded || !tokenClient) {
      console.error("Scripts not loaded yet");
      return;
    }

    // Check if we already have a valid token (simplified)
    const storedToken = sessionStorage.getItem("gapi_access_token");
    if (storedToken) {
      showPicker(storedToken, onSelect);
    } else {
      // Request new token
      tokenClient.callback = async (response: any) => {
        if (response.error !== undefined) {
          throw response;
        }
        sessionStorage.setItem("gapi_access_token", response.access_token);
        showPicker(response.access_token, onSelect);
      };
      tokenClient.requestAccessToken({ prompt: "consent" });
    }
  };

  const isReady = isGapiLoaded && isGisLoaded && !!CLIENT_ID && !!API_KEY;

  return { openPicker, isReady, isConfigured: !!CLIENT_ID && !!API_KEY };
}