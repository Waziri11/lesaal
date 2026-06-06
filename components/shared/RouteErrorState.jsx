"use client";

import PageState from "./PageState";

export default function RouteErrorState({ error, reset }) {
  return <PageState status="error" errorMessage={error?.message || "Unknown error"} onRetry={reset} />;
}
