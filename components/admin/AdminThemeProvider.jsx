"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "lesaal-admin-theme";
const DEFAULT_THEME = "dark";

const AdminThemeContext = createContext({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  toggleTheme: () => {},
});

function normalizeTheme(value) {
  return value === "light" ? "light" : "dark";
}

export function AdminThemeProvider({ children }) {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem(STORAGE_KEY);
      if (storedTheme) {
        setTheme(normalizeTheme(storedTheme));
      }
    } catch {
      setTheme(DEFAULT_THEME);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, normalizeTheme(theme));
    } catch {
      // Ignore storage write failures.
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (nextTheme) => setTheme(normalizeTheme(nextTheme)),
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    }),
    [theme]
  );

  return (
    <AdminThemeContext.Provider value={value}>
      <div className="admin-theme min-h-screen bg-[color:var(--ui-background)] text-[color:var(--ui-foreground)]" data-theme={theme}>
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}
