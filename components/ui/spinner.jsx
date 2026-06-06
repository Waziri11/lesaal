import { cn } from "../../lib/utils";

export function Spinner({ className }) {
  return (
    <span
      className={cn(
        "inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--ui-muted-foreground)] border-t-[color:var(--ui-primary)]",
        className
      )}
      aria-hidden="true"
    />
  );
}
