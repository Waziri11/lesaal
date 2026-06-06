import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ui-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ui-background)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[color:var(--ui-primary)] text-[color:var(--ui-primary-foreground)] hover:opacity-90",
        secondary: "bg-[color:var(--ui-secondary)] text-[color:var(--ui-secondary-foreground)] hover:opacity-90",
        outline:
          "border border-[color:var(--ui-border)] bg-transparent text-[color:var(--ui-foreground)] hover:bg-[color:var(--ui-accent)] hover:text-[color:var(--ui-accent-foreground)]",
        ghost: "text-[color:var(--ui-foreground)] hover:bg-[color:var(--ui-accent)] hover:text-[color:var(--ui-accent-foreground)]",
        destructive: "bg-[color:var(--ui-destructive)] text-[color:var(--ui-destructive-foreground)] hover:opacity-90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };
