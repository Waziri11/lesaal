"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "../ui/button";

const DEFAULT_LOGIN_URL = "/admin/login?reason=session-expired";

function sanitizeNextPath(value) {
  const candidate = String(value || "").trim();

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "";
  }

  if (!candidate.startsWith("/admin")) {
    return "";
  }

  return candidate;
}

function buildLoginUrlForCurrentLocation() {
  if (typeof window === "undefined") {
    return DEFAULT_LOGIN_URL;
  }

  const nextPath = sanitizeNextPath(`${window.location.pathname || ""}${window.location.search || ""}`);

  if (!nextPath) {
    return DEFAULT_LOGIN_URL;
  }

  return `${DEFAULT_LOGIN_URL}&next=${encodeURIComponent(nextPath)}`;
}

function resolveRequestPath(input) {
  try {
    if (typeof input === "string") {
      return new URL(input, window.location.origin).pathname;
    }

    if (input instanceof Request) {
      return new URL(input.url, window.location.origin).pathname;
    }

    if (input && typeof input.url === "string") {
      return new URL(input.url, window.location.origin).pathname;
    }
  } catch (error) {
    return "";
  }

  return "";
}

function isAdminApiRequest(input) {
  const pathname = resolveRequestPath(input);
  return pathname.startsWith("/api/admin/");
}

export default function AdminSessionExpiryGuard() {
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loginUrl, setLoginUrl] = useState(DEFAULT_LOGIN_URL);

  const markSessionExpired = useCallback(() => {
    setLoginUrl(buildLoginUrlForCurrentLocation());
    setSessionExpired(true);
  }, []);

  useEffect(() => {
    if (!sessionExpired) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sessionExpired]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (!sessionExpired && response?.status === 401 && isAdminApiRequest(args[0])) {
        markSessionExpired();
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [markSessionExpired, sessionExpired]);

  useEffect(() => {
    if (typeof window === "undefined" || sessionExpired) return undefined;

    let isCancelled = false;

    async function checkSession() {
      try {
        const response = await window.fetch("/api/admin/session", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!isCancelled && response.status === 401) {
          markSessionExpired();
        }
      } catch (error) {
        // Ignore transient network failures and retry on the next heartbeat.
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSession();
      }
    };

    checkSession();
    const intervalId = window.setInterval(checkSession, 30000);
    window.addEventListener("focus", checkSession);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", checkSession);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [markSessionExpired, sessionExpired]);

  if (!sessionExpired) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-[color:var(--ui-foreground)]">Session expired</h2>
        <p className="mt-2 text-sm text-[color:var(--ui-muted-foreground)]">
          Your session has expired for security reasons. Please sign in again to continue. After login, you&apos;ll return to this page.
        </p>

        <div className="mt-5 flex justify-end">
          <Button asChild>
            <a href={loginUrl}>Go to login</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
