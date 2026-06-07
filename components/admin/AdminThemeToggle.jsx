"use client";

import { Moon, Sun } from "lucide-react";
import { useAdminTheme } from "./AdminThemeProvider";
import { cn } from "../../lib/utils";

export default function AdminThemeToggle() {
  const { theme, toggleTheme } = useAdminTheme();
  const switchToLight = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--ui-border)] text-[color:var(--ui-muted-foreground)] transition-colors hover:bg-[color:var(--ui-accent)] hover:text-[color:var(--ui-foreground)]"
      aria-label={switchToLight ? "Switch to light mode" : "Switch to dark mode"}
      title={switchToLight ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun
        className={cn(
          "absolute h-4 w-4 transition-all duration-300 ease-out",
          switchToLight ? "rotate-0 scale-100 opacity-100" : "-rotate-45 scale-75 opacity-0"
        )}
        aria-hidden="true"
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 transition-all duration-300 ease-out",
          switchToLight ? "rotate-45 scale-75 opacity-0" : "rotate-0 scale-100 opacity-100"
        )}
        aria-hidden="true"
      />
    </button>
  );
}
