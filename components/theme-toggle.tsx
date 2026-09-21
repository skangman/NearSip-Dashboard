"use client";

import { THEME_STORAGE_KEY, type ThemeMode } from "@/lib/domain/theme";

type ThemeToggleProps = { className?: string };

/**
 * Light / dark switch. The active theme lives on <html data-theme> (set before hydration by
 * THEME_INIT_SCRIPT), and the moon/sun icon is chosen by CSS from that attribute, so this
 * component renders identically on server and client.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  function toggle() {
    const root = document.documentElement;
    const next: ThemeMode = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // The theme still switches for this visit when browser storage is unavailable.
    }
  }

  return (
    <button
      type="button"
      className={className ? `theme-toggle ${className}` : "theme-toggle"}
      onClick={toggle}
      aria-label="สลับโหมดสว่าง / มืด"
      title="สลับโหมดสว่าง / มืด"
    >
      <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
