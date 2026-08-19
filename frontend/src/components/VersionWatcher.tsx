import { useEffect, useRef } from "react";

const CHECK_INTERVAL_MS = 60_000;

async function fetchVersion(): Promise<string | null> {
  try {
    const response = await fetch("/version", { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    return data.version ?? null;
  } catch {
    return null;
  }
}

// Once a browser (or Telegram's WebView) has index.html cached, it won't
// know a new build exists until it reloads. This polls a tiny, always-fresh
// endpoint for the current build's version and force-reloads the page the
// moment it changes, so a deploy reaches every open tab without anyone
// having to clear their cache by hand.
export function VersionWatcher() {
  const knownVersion = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkVersion() {
      const version = await fetchVersion();
      if (cancelled || version === null) return;

      if (knownVersion.current === null) {
        knownVersion.current = version;
        return;
      }

      if (version !== knownVersion.current) {
        window.location.reload();
      }
    }

    checkVersion();
    const interval = setInterval(checkVersion, CHECK_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") checkVersion();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
