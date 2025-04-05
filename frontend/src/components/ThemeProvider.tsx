"use client";

import * as React from "react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
};

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "splitsphere-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // Only run client-side effects after mounting
  useEffect(() => {
    setMounted(true);
    
    // Get initial theme from localStorage only after mounting
    const savedTheme = localStorage.getItem(storageKey) as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
    
    // Apply theme to root element
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [storageKey, theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      if (mounted) {
        localStorage.setItem(storageKey, theme);
      }
      setTheme(theme);
    },
  };

  // Prevent flash of unstyled content by not rendering until mounted
  if (!mounted) {
    return (
      <div style={{ visibility: "hidden" }}>
        <ThemeProviderContext.Provider {...props} value={value}>
          {children}
        </ThemeProviderContext.Provider>
      </div>
    );
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
}; 