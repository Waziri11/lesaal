import { Root } from "@radix-ui/react-label";
import { cn } from "../../lib/utils";

export function Label({ className, ...props }) {
  return <Root className={cn("text-sm font-medium leading-none text-[color:var(--ui-foreground)]", className)} {...props} />;
}
