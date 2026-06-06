import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[color:var(--ui-border)] bg-[color:var(--ui-secondary)] text-[color:var(--ui-secondary-foreground)]",
        secondary: "border-[color:var(--ui-primary)] bg-[color:var(--ui-primary-soft)] text-[color:var(--ui-primary)]",
        success:
          "border-[color:var(--ui-success)] bg-[color:var(--ui-success-soft)] text-[color:var(--ui-success)]",
        destructive:
          "border-[color:var(--ui-destructive)] bg-[color:var(--ui-destructive-soft)] text-[color:var(--ui-destructive)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
