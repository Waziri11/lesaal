import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "../../lib/utils";

export function Popover({ ...props }) {
  return <PopoverPrimitive.Root {...props} />;
}

export function PopoverTrigger({ ...props }) {
  return <PopoverPrimitive.Trigger {...props} />;
}

export function PopoverContent({ className, align = "center", sideOffset = 6, ...props }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-md border border-[color:var(--ui-border)] bg-[color:var(--ui-popover)] p-4 text-[color:var(--ui-popover-foreground)] shadow-md outline-none",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
