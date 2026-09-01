"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, CloudSun, LogOut, MapPin, Menu, MessageCircle, Search, Settings, User, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";

const NAV_LINKS = [
  { href: "/home", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/alerts", label: "Alerts" },
  { href: "/assistant", label: "Assistant" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { location } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  if (pathname === "/" || pathname === "/login" || pathname === "/signup") {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-navy-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <div className="flex items-center gap-6">
          <Link href="/home" className="flex items-center gap-2 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-500/20">
              <CloudSun className="h-5 w-5 text-navy-950" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-mist-100">MAUSAM</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? "bg-white/10 text-mist-100"
                    : "text-mist-400 hover:text-mist-100 hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/explore"
            className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-mist-300 hover:bg-white/10 hover:text-mist-100 transition-colors"
          >
            <MapPin className="h-3.5 w-3.5 text-sky-400" />
            <span className="max-w-[140px] truncate">{location.name}</span>
            <Search className="h-3.5 w-3.5 opacity-60" />
          </Link>

          <Link
            href="/alerts"
            className="rounded-full p-2 text-mist-300 hover:bg-white/10 hover:text-mist-100 transition-colors"
            aria-label="Alerts"
          >
            <Bell className="h-5 w-5" />
          </Link>

          <div className="relative hidden sm:block">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-mist-100 hover:bg-white/20 transition-colors"
              aria-label="Profile menu"
            >
              <User className="h-4 w-4" />
            </button>
            {profileOpen && (
              <div
                className="glass absolute right-0 mt-2 w-52 rounded-2xl p-2 text-sm"
                onMouseLeave={() => setProfileOpen(false)}
              >
                <p className="truncate px-3 py-2 text-xs text-mist-400">{user?.email}</p>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-mist-200 hover:bg-white/10"
                  onClick={() => setProfileOpen(false)}
                >
                  <Settings className="h-4 w-4" /> Profile & Preferences
                </Link>
                <Link
                  href="/assistant"
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-mist-200 hover:bg-white/10"
                  onClick={() => setProfileOpen(false)}
                >
                  <MessageCircle className="h-4 w-4" /> AI Assistant
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-rose-400 hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden rounded-full p-2 text-mist-300 hover:bg-white/10"
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-white/5 px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                pathname.startsWith(link.href) ? "bg-white/10 text-mist-100" : "text-mist-300"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/profile" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 text-sm text-mist-300">
            Profile & Preferences
          </Link>
          <button onClick={handleSignOut} className="rounded-xl px-3 py-2 text-left text-sm text-rose-400">
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
