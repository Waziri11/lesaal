import { cn } from "../../lib/utils";

export function Separator({ className }) {
  return <div role="separator" className={cn("h-px w-full bg-[color:var(--ui-border)]", className)} />;
}
