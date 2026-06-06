import { Inbox } from "lucide-react";
import { cn } from "../../lib/utils";

export function EmptyState({ className, title, description, action }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-[color:var(--ui-border)] bg-[color:var(--ui-card)] px-6 py-10 text-center",
        className
      )}
    >
      <Inbox className="h-8 w-8 text-[color:var(--ui-muted-foreground)]" aria-hidden="true" />
      <h3 className="mt-3 text-lg font-semibold text-[color:var(--ui-foreground)]">{title}</h3>
      {description ? <p className="mt-1 text-sm text-[color:var(--ui-muted-foreground)]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
