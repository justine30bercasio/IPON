"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
} from "lucide-react";

export function ChallengeTabs({ challengeId, isAdmin }: { challengeId: string; isAdmin: boolean }) {
  const pathname = usePathname();

  const tabs = [
    { href: `/challenges/${challengeId}`, label: "Overview", icon: LayoutDashboard },
    { href: `/challenges/${challengeId}/transactions`, label: "Hulog", icon: Receipt },
    { href: `/challenges/${challengeId}/members`, label: "Members", icon: Users },
    { href: `/challenges/${challengeId}/calendar`, label: "Calendar", icon: CalendarDays },
    ...(isAdmin
      ? [
          { href: `/challenges/${challengeId}/reports`, label: "Reports", icon: BarChart3 },
          { href: `/challenges/${challengeId}/settings`, label: "Settings", icon: Settings },
        ]
      : []),
  ];

  return (
    <div className="no-scrollbar -mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex w-max gap-1.5">
        {tabs.map((tab) => {
          const active =
            tab.href === `/challenges/${challengeId}`
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold transition-all ${
                active
                  ? "bg-ink text-white shadow-soft"
                  : "bg-white text-ink-soft ring-1 ring-line hover:bg-mist hover:text-ink"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}