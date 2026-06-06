"use client";

import RouteErrorState from "../../../components/shared/RouteErrorState";

export default function Error({ error, reset }) {
  return <RouteErrorState error={error} reset={reset} />;
}
