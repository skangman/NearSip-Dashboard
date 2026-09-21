export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "nearsip_theme";

/**
 * Runs before hydration (see app/layout.tsx) so the first paint already has the right theme.
 * Uses the saved choice if any, otherwise follows the OS setting — and keeps following it
 * until the user picks a mode with the toggle.
 */
export const THEME_INIT_SCRIPT = `(function(){var k=${JSON.stringify(THEME_STORAGE_KEY)},r=document.documentElement,m=window.matchMedia("(prefers-color-scheme: dark)");function s(){try{var v=localStorage.getItem(k);return v==="light"||v==="dark"?v:null}catch(e){return null}}r.dataset.theme=s()||(m.matches?"dark":"light");if(m.addEventListener)m.addEventListener("change",function(e){if(!s())r.dataset.theme=e.matches?"dark":"light"})})();`;
