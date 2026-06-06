"use client";

import { Moon, Sun } from "lucide-react";
import { useAdminTheme } from "./AdminThemeProvider";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

export default function AdminThemeToggle() {
  const { theme, toggleTheme } = useAdminTheme();

  return (
    <div className="flex items-center gap-2">
      <Sun className="h-4 w-4 text-[color:var(--ui-muted-foreground)]" aria-hidden="true" />
      <Switch id="admin-theme-toggle" checked={theme === "dark"} onCheckedChange={toggleTheme} aria-label="Toggle admin theme" />
      <Moon className="h-4 w-4 text-[color:var(--ui-muted-foreground)]" aria-hidden="true" />
      <Label htmlFor="admin-theme-toggle" className="text-xs text-[color:var(--ui-muted-foreground)]">
        {theme === "dark" ? "Dark" : "Light"}
      </Label>
    </div>
  );
}
