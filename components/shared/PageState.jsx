"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { getLoadingMessageForElapsedMs } from "../../lib/loading-state";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import { Spinner } from "../ui/spinner";

export function useProgressiveLoadingMessage(active) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsedMs(0);
      return undefined;
    }

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 400);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [active]);

  return useMemo(() => getLoadingMessageForElapsedMs(elapsedMs), [elapsedMs]);
}

function buildEmptyCopy(resourceLabel) {
  return `There are no ${resourceLabel} as of current`;
}

export default function PageState({
  status = "loaded",
  resourceLabel = "items",
  errorMessage = "Unknown error",
  createAction,
  onRetry,
  children,
  className = "",
}) {
  const loadingMessage = useProgressiveLoadingMessage(status === "loading");

  if (status === "loading") {
    return (
      <div className={`flex min-h-[70vh] w-full items-center justify-center ${className}`.trim()}>
        <div className="flex items-center gap-3">
          <Spinner className="h-5 w-5" />
          <p className="text-sm text-[color:var(--ui-muted-foreground)]">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[color:var(--ui-destructive)]">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            Error
          </CardTitle>
          <CardDescription>{String(errorMessage || "Unknown error")}</CardDescription>
        </CardHeader>
        {(onRetry || createAction) ? (
          <CardContent className="flex flex-wrap items-center gap-2">
            {onRetry ? (
              <Button type="button" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
            {createAction || null}
          </CardContent>
        ) : null}
      </Card>
    );
  }

  if (status === "empty") {
    return (
      <EmptyState
        className={className}
        title={buildEmptyCopy(resourceLabel)}
        action={createAction || null}
      />
    );
  }

  return children;
}
