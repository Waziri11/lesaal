import { cn } from "../../lib/utils";

export function SelectNative({ className, ...props }) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-[color:var(--ui-border)] bg-[color:var(--ui-input)] px-3 py-2 text-sm text-[color:var(--ui-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ui-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ui-background)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
