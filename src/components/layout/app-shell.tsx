"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Trophy,
  Coins,
  Activity,
  Bell,
  Plus,
  Users,
  LogOut,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AddHulogModal } from "@/components/add-hulog-modal";
import { SignOutButton } from "@/components/sign-out-button";

export interface ShellNavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const deskNav: ShellNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/challenges", label: "Challenges", icon: Trophy },
  { href: "/hulog", label: "Hulog History", icon: Coins },
  { href: "/activity", label: "Activity", icon: Activity },
];

const mobileNav: ShellNavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/challenges", label: "Challenges", icon: Trophy },
  { href: "/hulog", label: "Hulog", icon: Coins },
  { href: "/activity", label: "Activity", icon: Activity },
];

export function AppShell({
  user,
  orgName,
  challenges,
  unread,
  children,
}: {
  user: { id: string; name: string; role: string; email?: string };
  orgName: string;
  challenges: {
    id: string;
    name: string;
    status: string;
    orgName?: string;
    members?: { id: string; name: string }[];
  }[];
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [hulogOpen, setHulogOpen] = React.useState(false);

  const isAdmin = user.role === "ADMIN";
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const nav = deskNav;
  const mobNav = mobileNav;
  const extranav: ShellNavItem[] = [
    ...(isAdmin ? [{ href: "/members", label: "Members", icon: Users }] : []),
    ...(isSuperAdmin
      ? [
          { href: "/admin", label: "Super Admin", icon: Users },
          { href: "/members", label: "Members", icon: Users },
        ]
      : []),
  ];

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard" || pathname === "/"
      : pathname.startsWith(href);

  return (
    <div className="flex min-h-dvh flex-col">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line/70 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 px-6">
          <PiggyLogo />
          <div className="min-w-0">
            <span className="block text-xl font-extrabold tracking-tight text-ink">IPON</span>
            {orgName && (
              <p className="-mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-brand-600">
                {orgName}
              </p>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 no-scrollbar">
          {nav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}

          <div className="px-3 pb-1 pt-6 text-[11px] font-bold uppercase tracking-wider text-ink-soft/40">
            My challenges
          </div>
          <div className="space-y-1">
            {challenges.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                href={`/challenges/${c.id}`}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                  pathname.startsWith(`/challenges/${c.id}`)
                    ? "bg-brand-50 font-semibold text-brand-700"
                    : "font-medium text-ink-soft hover:bg-mist hover:text-ink"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Coins className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{c.name}</span>
                  {user.role === "SUPER_ADMIN" && c.orgName && (
                    <span className="block truncate text-[10px] font-semibold text-brand-600/70">
                      {c.orgName}
                    </span>
                  )}
                </span>
              </Link>
            ))}
            {challenges.length > 6 && (
              <Link
                href="/challenges"
                className="block px-3 py-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                See all {challenges.length} challenges →
              </Link>
            )}
          </div>

          {extranav.length > 0 && (
            <>
              <div className="px-3 pb-1 pt-6 text-[11px] font-bold uppercase tracking-wider text-ink-soft/40">
                Administration
              </div>
              {extranav.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-line/60 p-4">
          <div className="flex items-center gap-3">
            <Link href="/profile">
              <Avatar name={user.name} size="md" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{user.name}</p>
              <p className="text-xs capitalize text-ink-soft/70">
                {user.role === "SUPER_ADMIN"
                  ? "Super Admin"
                  : user.role === "ADMIN"
                    ? "Administrator"
                    : "Member"}
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
                } catch {
                  /* ignore */
                }
                router.push("/login?loggedOut=1");
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft/60 transition-colors hover:bg-mist hover:text-ink"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 border-t border-line/60 pt-3 text-center text-[11px] font-medium text-ink-soft/50">
            Developed by Justine Bercasio · Founder of CodeCraft Solution
          </p>
        </div>
      </aside>

      <div className="flex-1 lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line/70 bg-mist/85 px-4 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-2.5 lg:hidden">
            <PiggyLogo />
            <span className="text-lg font-extrabold tracking-tight text-ink">IPON</span>
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-ink-soft/70">
              {new Date().toLocaleDateString("en-PH", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="lg:hidden">
              <SignOutButton variant="icon" />
            </span>
            <Link
              href="/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-soft shadow-soft transition-colors hover:text-ink"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-mist">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <Link href="/profile" className="lg:hidden">
              <Avatar name={user.name} size="sm" />
            </Link>
          </div>
        </header>

        <main className="w-full px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>

      <nav className="sticky bottom-0 z-30 mt-auto border-t border-line/70 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1.5">
          {mobNav.slice(0, 2).map((item) => (
            <MobileNavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
          <button
            onClick={() => setHulogOpen(true)}
            className="-mt-7 flex flex-col items-center gap-0.5"
            aria-label="Add hulog"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-glow ring-4 ring-white transition-transform active:scale-95 hover:bg-brand-700">
              <Plus className="h-6 w-6" />
            </span>
            <span className="text-[10px] font-semibold text-brand-700">Hulog</span>
          </button>
          {mobNav.slice(2).map((item) => (
            <MobileNavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>

      <AddHulogModal
        key={hulogOpen ? "open" : "closed"}
        open={hulogOpen}
        onClose={() => setHulogOpen(false)}
        challenges={challenges}
        isAdmin={user.role === "ADMIN" || user.role === "SUPER_ADMIN"}
        onDone={() => setHulogOpen(false)}
      />
    </div>
  );
}

function PiggyLogo() {
  return (
    <Image src="/logo.png" alt="IPON" width={500} height={500} className="h-12 w-12 rounded-xl bg-white object-contain shadow-glow" />
  );
}

function NavLink({
  item,
  active,
}: {
  item: ShellNavItem;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200 ${
        active
          ? "bg-brand-50 font-bold text-brand-700"
          : "font-semibold text-ink-soft hover:bg-mist hover:text-ink"
      }`}
    >
      <Icon className={`h-[18px] w-[18px] ${active ? "text-brand-600" : ""}`} />
      {item.label}
      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />
      )}
    </Link>
  );
}

function MobileNavLink({
  item,
  active,
}: {
  item: ShellNavItem;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex w-16 flex-col items-center gap-1 rounded-xl py-1.5 transition-colors ${
        active ? "text-brand-700" : "text-ink-soft/60"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-bold">{item.label}</span>
      <span
        className={`h-1 w-1 rounded-full transition-colors ${
          active ? "bg-brand-500" : "bg-transparent"
        }`}
      />
    </Link>
  );
}

export function AdminBadge() {
  return <Badge tone="primary">Organizer</Badge>;
}