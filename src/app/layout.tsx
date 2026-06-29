import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "@/components/ThemeToggle";

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

// Runs before paint to apply the saved (or system) theme — prevents a flash.
const themeInit = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface text-fg">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <header className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <Link href="/" className="text-lg font-bold text-fg">
              🚀 Listwave
            </Link>
            <div className="flex items-center gap-2">
              {user && (
                <Link
                  href="/outlets"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:text-fg"
                >
                  Outlets
                </Link>
              )}
              <ThemeToggle />
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
