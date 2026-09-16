import { format } from "date-fns";
import {
  UserPlus,
  UserMinus,
  CircleDollarSign,
  CheckCheck,
  Ban,
  Pencil,
  Trophy,
  Settings,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatTimeAgo } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";

const typeMeta: Record<string, { icon: React.ElementType; bg: string; text: string; label: string }> = {
  HULOG: { icon: CircleDollarSign, bg: "bg-brand-100", text: "text-brand-700", label: "Hulog" },
  HULOG_CONFIRMED: { icon: CheckCheck, bg: "bg-emerald-100", text: "text-emerald-700", label: "Confirmed" },
  HULOG_VOIDED: { icon: Ban, bg: "bg-rose-100", text: "text-rose-700", label: "Voided" },
  HULOG_EDITED: { icon: Pencil, bg: "bg-amber-100", text: "text-amber-700", label: "Edited" },
  MEMBER_ADDED: { icon: UserPlus, bg: "bg-brand-100", text: "text-brand-700", label: "Member" },
  MEMBER_REMOVED: { icon: UserMinus, bg: "bg-mist", text: "text-ink-soft", label: "Removed" },
  MEMBER_STATUS: { icon: UserCog, bg: "bg-amber-100", text: "text-amber-700", label: "Updated" },
  CHALLENGE_CREATED: { icon: Trophy, bg: "bg-violet-100", text: "text-violet-700", label: "Challenge" },
  CHALLENGE_UPDATED: { icon: Settings, bg: "bg-sky-100", text: "text-sky-700", label: "Settings" },
  PASSWORD_RESET: { icon: ShieldCheck, bg: "bg-rose-100", text: "text-rose-700", label: "Password" },
};

export default async function ActivityPage() {
  const user = await requireUser();

  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, role: true } },
      challenge: { select: { id: true, name: true } },
    },
  });

  const visible = logs.filter((l) => {
    if (user.role === "ADMIN") return true;
    return l.userId === user.id || l.challengeId === null;
  });

  const byDay = new Map<string, typeof visible>();
  for (const log of visible) {
    const day = format(log.createdAt, "yyyy-MM-dd");
    const list = byDay.get(day) ?? [];
    list.push(log);
    byDay.set(day, list);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        subtitle="The latest happenings across every challenge you're part of."
      />

      {visible.length === 0 ? (
        <EmptyState
          emoji="📭"
          title="No activity yet"
          description="Challenges, hulog, and member changes will show up here."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {Array.from(byDay.entries()).map(([day, logs]) => (
            <div key={day} className="animate-fade-up">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft/50">
                {new Date(day + "T12:00:00").toLocaleDateString("en-PH", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <div className="overflow-hidden rounded-2xl border border-line/70 bg-white shadow-soft">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-line/70 bg-mist/60 text-[11px] uppercase tracking-wider text-ink-soft/60">
                        <th className="px-4 py-3 font-bold">Who</th>
                        <th className="px-4 py-3 font-bold">Action</th>
                        <th className="px-4 py-3 font-bold">Details</th>
                        <th className="px-4 py-3 text-right font-bold">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => {
                        const meta = typeMeta[log.type] ?? typeMeta.HULOG;
                        const Icon = meta.icon;
                        const performer = log.user?.id === user.id ? "You" : (log.user?.name ?? "System");
                        return (
                          <tr key={log.id} className="border-b border-line/40 last:border-0 hover:bg-mist/40">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <Avatar name={performer} size="sm" />
                                <span className="font-bold text-ink">{performer}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.bg} ${meta.text}`}>
                                  <Icon className="h-3.5 w-3.5" />
                                </span>
                                <span className="font-semibold text-ink-soft">{meta.label}</span>
                              </div>
                            </td>
                            <td className="min-w-40 px-4 py-3.5 font-medium text-ink-soft">
                              {log.challenge ? `In “${log.challenge.name}”` : "On your account"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-right text-xs font-medium text-ink-soft/70">
                              {formatTimeAgo(log.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}