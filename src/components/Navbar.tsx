"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  clearSession,
  getSession,
  sessionChangeEventName,
  type SessionUser,
} from "@/lib/auth";

export default function Navbar() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const refreshSession = () => setSession(getSession());
    refreshSession();

    const eventName = sessionChangeEventName();
    window.addEventListener(eventName, refreshSession);
    window.addEventListener("storage", refreshSession);
    return () => {
      window.removeEventListener(eventName, refreshSession);
      window.removeEventListener("storage", refreshSession);
    };
  }, []);

  const handleLogout = () => {
    clearSession();
    router.push("/");
  };

  const itemClass = (href: string) =>
    `rounded-md px-3 py-2 text-sm transition ${
      pathname === href
        ? "bg-blue-100 text-blue-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-base font-semibold text-slate-900">
          Python Learning
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/" className={itemClass("/")}>
            Home
          </Link>
          <Link href="/learn" className={itemClass("/learn")}>
            Learn
          </Link>
          <Link href="/ranking" className={itemClass("/ranking")}>
            Ranking
          </Link>

          {session?.role === "admin" && (
            <Link href="/admin/export" className={itemClass("/admin/export")}>
              Admin Panel
            </Link>
          )}

          {!session ? (
            <Link
              href="/login"
              className="ml-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Login
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="ml-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Logout ({session.nickname})
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
