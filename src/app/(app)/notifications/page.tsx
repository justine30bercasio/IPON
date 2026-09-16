import Link from "next/link";
import { CircleDollarSign, UserPlus, Trophy, ShieldCheck, CheckCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { markAllNotificationsReadAction } from "@/lib/actions";
import { formatTimeAgo } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MarkAllReadButton } from "./mark-all-read";

const iconFor = (type: string) => {
  if (type.startsWith("HULOG")) return { icon: CircleDollarSign, bg: "bg-brand-100", text: "text-brand-700" };
  if (type.startsWith("MEMBER")) return { icon: UserPlus, bg: "bg-violet-100", text: "text-violet-700" };
  if (type.startsWith("CHALLENGE")) return { icon: Trophy, bg: "bg-amber-100", text: "text-amber-700" };
  if (type.startsWith("PASSWORD")) return { icon: ShieldCheck, bg: "bg-rose-100", text: "text-rose-700" };
  return { icon: CheckCheck, bg: "bg-sky-100", text: "text-sky-700" };
};

export default async function NotificationsPage() {
  const user = await requireUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: [{ read: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={
          unread > 0 ? `You have ${unread} unread notification${unread > 1 ? "s" : ""}.` : "You're all caught up."
        }
        actions={
          unread > 0 ? (
            <MarkAllReadButton action={markAllNotificationsReadAction} />
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          emoji="🔔"
          title="No notifications yet"
          description="Hulog status, member invites, and challenge news will land here."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line/70 bg-white shadow-soft">
          {notifications.map((n, i) => {
            const { icon: Icon, bg, text } = iconFor(n.type);
            const body = (
              <div
                className={`flex items-start gap-3.5 px-4 py-3.5 transition-colors hover:bg-mist/60 ${
                  !n.read ? "bg-brand-50/60" : ""
                } ${i > 0 ? "border-t border-line/50" : ""}`}
              >
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg} ${text}`}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-ink">{n.title}</p>
                    {!n.read && (
                      <Badge tone="primary" className="shrink-0">New</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft/80">{n.body}</p>
                  <p className="mt-1 text-[11px] font-medium text-ink-soft/50">
                    {formatTimeAgo(n.createdAt)}
                  </p>
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link}>
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}