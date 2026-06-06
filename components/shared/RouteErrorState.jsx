"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageState from "./PageState";
import RouteLoadingState from "./RouteLoadingState";

function getRedirectInfo(error) {
  const digest = String(error?.digest || "");
  const message = String(error?.message || "");
  const hasRedirectSignature = digest.includes("NEXT_REDIRECT") || message.includes("NEXT_REDIRECT");

  if (!hasRedirectSignature) {
    return null;
  }

  const [prefix, mode, target] = digest.split(";");
  if (prefix === "NEXT_REDIRECT" && target && target.startsWith("/")) {
    return {
      mode: mode === "push" ? "push" : "replace",
      target,
    };
  }

  return {
    mode: "replace",
    target: "/",
  };
}

export default function RouteErrorState({ error, reset, resourceLabel = "page" }) {
  const router = useRouter();
  const redirectInfo = useMemo(() => getRedirectInfo(error), [error]);

  useEffect(() => {
    if (!redirectInfo) {
      return;
    }

    if (redirectInfo.mode === "push") {
      router.push(redirectInfo.target);
      return;
    }

    router.replace(redirectInfo.target);
  }, [redirectInfo, router]);

  if (redirectInfo) {
    return <RouteLoadingState resourceLabel={resourceLabel} />;
  }

  return <PageState status="error" errorMessage={error?.message || "Unknown error"} onRetry={reset} />;
}
