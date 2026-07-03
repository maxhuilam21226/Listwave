import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { getThemePreference } from "@/lib/data";
import ThemeControls from "@/components/ThemeControls";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Listwave",
  description: "Prep once, launch everywhere. A personal launch cockpit.",
};

// Runs before paint to apply the theme with no flash. The user's DB-saved
// preference (passed from the server) wins on a fresh device; otherwise we fall
// back to localStorage, then the app default: Aurora Glass in dark mode.
// Whatever the server sends is also mirrored into localStorage so the client
// picker and later loads stay in sync.
function themeInitScript(family: string | null, mode: string | null) {
  return `(function(){try{var e=document.documentElement;var sf=${JSON.stringify(
    family,
  )};var sm=${JSON.stringify(
    mode,
  )};var f=sf||localStorage.getItem('theme-family')||'aurora';e.setAttribute('data-theme',f);if(sf){localStorage.setItem('theme-family',sf);}var t=sm||localStorage.getItem('theme');var d=t?t==='dark':true;if(d){e.classList.add('dark');}if(sm){localStorage.setItem('theme',sm);}}catch(err){document.documentElement.setAttribute('data-theme','aurora');e.classList.add('dark');}})();`;
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const theme = await getThemePreference();
  const themeInit = themeInitScript(theme?.family ?? null, theme?.mode ?? null);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-fg">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <header className="panel sticky top-0 z-40 border-x-0 border-t-0">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold tracking-tight"
            >
              <span className="brand-ink">Listwave</span>
            </Link>
            <div className="flex items-center gap-2">
              {user && (
                <Link
                  href="/outlets"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:text-fg"
                >
                  Manage outlets
                </Link>
              )}
              <ThemeControls />
              {user && (
                <form action="/auth/signout" method="post">
                  <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-fg hover:bg-track">
                    Sign out
                  </button>
                </form>
              )}
            </div>
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
