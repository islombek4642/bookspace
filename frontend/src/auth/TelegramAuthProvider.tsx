import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { apiClient, setAuthToken } from "../api/client";

interface TelegramWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

type AuthStatus = "loading" | "authenticated" | "error";

interface AuthContextValue {
  status: AuthStatus;
}

const AuthContext = createContext<AuthContextValue>({ status: "loading" });

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

interface TelegramAuthResponse {
  access_token: string;
  token_type: string;
}

export function TelegramAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let ignore = false;

    const webApp = window.Telegram?.WebApp;
    const initData = webApp?.initData;

    if (!initData) {
      setStatus("error");
      return;
    }

    webApp?.ready();

    apiClient
      .post<TelegramAuthResponse>("/auth/telegram", { init_data: initData })
      .then((response) => {
        if (ignore) return;
        setAuthToken(response.access_token);
        setStatus("authenticated");
      })
      .catch(() => {
        if (ignore) return;
        setStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, []);

  return <AuthContext.Provider value={{ status }}>{children}</AuthContext.Provider>;
}
