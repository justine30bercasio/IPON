"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  UserCheck,
  UserX,
  Trash2,
  Banknote,
  KeyRound,
  Mail,
  Phone,
  Search,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { TablePagination } from "@/components/ui/table-pagination";
import { money, formatDate } from "@/lib/format";
import {
  addMembersAction,
  toggleMemberStatusAction,
  removeMemberAction,
  updateMemberProfileAction,
  resetUserPasswordAction,
  recordHulogForMemberAction,
  type ActionResult,
} from "@/lib/actions";

export interface MemberRow {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  status: string;
  isAdmin: boolean;
  total: number;
  count: number;
  thisMonth: number;
  lastHulog: string | null;
  lastHulogAmount: number | null;
}

export function MembersManager({
  challengeId,
  members,
  isAdmin,
  showAmounts,
}: {
  challengeId: string;
  members: MemberRow[];
  isAdmin: boolean;
  showAmounts: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MemberRow | null>(null);
  const [hulogFor, setHulogFor] = React.useState<MemberRow | null>(null);
  const [passwordFor, setPasswordFor] = React.useState<MemberRow | null>(null);
  const [deactivating, setDeactivating] = React.useState<MemberRow | null>(null);
  const [removing, setRemoving] = React.useState<MemberRow | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [memberPage, setMemberPage] = React.useState(1);
  const MEMBER_PAGE_SIZE = 8;

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return [...members]
      .sort((a, b) => b.total - a.total)
      .filter((m) => !needle || `${m.name} ${m.email}`.toLowerCase().includes(needle));
  }, [members, search]);
  const sorted = filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / MEMBER_PAGE_SIZE));
  const safePage = Math.min(memberPage, totalPages);
  const pageRows = sorted.slice((safePage - 1) * MEMBER_PAGE_SIZE, safePage * MEMBER_PAGE_SIZE);

  const run = async (fn: () => Promise<ActionResult>, success: string) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      toast("success", success);
      router.refresh();
      return true;
    }
    toast("error", "Something went wrong", res.error);
    return false;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/40" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setMemberPage(1);
            }}
            placeholder="Search members…"
            className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm text-ink shadow-soft outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
          />
        </div>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add members
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="rounded-2xl border border-line/70 bg-white shadow-soft">
          <EmptyState
            emoji="👥"
            title="No members yet"
            description="Start by adding your coworkers."
          />
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-line/70 bg-white shadow-soft md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line/70 bg-mist/60 text-[11px] uppercase tracking-wider text-ink-soft/70">
                  <th className="px-5 py-3 font-bold">Member</th>
                  <th className="px-5 py-3 text-right font-bold">Total Hulog</th>
                  <th className="px-5 py-3 text-right font-bold">This Month</th>
                  <th className="px-5 py-3 text-right font-bold">Tx</th>
                  <th className="px-5 py-3 font-bold">Last Hulog</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  {isAdmin && <th className="px-5 py-3 text-right font-bold">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((m) => (
                  <tr
                    key={m.userId}
                    className="border-b border-line/40 transition-colors last:border-0 hover:bg-brand-50/30"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-bold text-ink">
                            {m.name}
                            {m.isAdmin && (
                              <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                                Organizer
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-ink-soft/70">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-base font-extrabold text-brand-700">
                      {showAmounts ? money(m.total) : "•••"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-ink">
                      {showAmounts ? money(m.thisMonth) : "•••"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-ink-soft">{m.count}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-medium text-ink-soft">
                      {m.lastHulog ? formatDate(m.lastHulog) : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={m.status === "ACTIVE" ? "success" : "neutral"}>
                        {m.status === "ACTIVE" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3.5 text-right">
                        <MemberRowActions
                          member={m}
                          onEdit={() => setEditing(m)}
                          onHulog={() => setHulogFor(m)}
                          onPassword={() => setPasswordFor(m)}
                          onToggle={() => setDeactivating(m)}
                          onRemove={() => setRemoving(m)}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {pageRows.map((m) => (
              <div key={m.userId} className="rounded-2xl border border-line/70 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} />
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                        {m.name}
                        {m.isAdmin && (
                          <Badge tone="primary" className="px-1.5 py-0">
                            Org
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-ink-soft/70">{m.email}</p>
                    </div>
                  </div>
                  <Badge tone={m.status === "ACTIVE" ? "success" : "neutral"}>
                    {m.status === "ACTIVE" ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <MiniStat label="Total" value={showAmounts ? money(m.total) : "•••"} />
                  <MiniStat label="This month" value={showAmounts ? money(m.thisMonth) : "•••"} />
                  <MiniStat label="Tx" value={String(m.count)} />
                </div>
                {isAdmin && (
                  <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-line/50 pt-3">
                    <RoundAction title="Add hulog" onClick={() => setHulogFor(m)}>
                      <Banknote className="h-4 w-4" />
                    </RoundAction>
                    <RoundAction title="Edit" onClick={() => setEditing(m)}>
                      <Pencil className="h-4 w-4" />
                    </RoundAction>
                    <RoundAction title={m.status === "ACTIVE" ? "Deactivate" : "Reactivate"} onClick={() => setDeactivating(m)}>
                      {m.status === "ACTIVE" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </RoundAction>
                    <RoundAction title="Remove" danger onClick={() => setRemoving(m)}>
                      <Trash2 className="h-4 w-4" />
                    </RoundAction>
                  </div>
                )}
              </div>
            ))}
          </div>

          <TablePagination
            page={safePage}
            totalPages={totalPages}
            total={sorted.length}
            pageSize={MEMBER_PAGE_SIZE}
            onPage={setMemberPage}
          />
        </>
      )}

      {isAdmin && (
        <AddMembersModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          challengeId={challengeId}
        />
      )}

      <EditMemberModal key={editing?.userId ?? "none"} member={editing} onClose={() => setEditing(null)} />
      <ResetPasswordModal key={passwordFor?.userId ?? "none"} member={passwordFor} onClose={() => setPasswordFor(null)} />

      <RecordHulogForMember
        key={hulogFor?.userId ?? "none"}
        challengeId={challengeId}
        member={hulogFor}
        onClose={() => setHulogFor(null)}
      />

      <ConfirmDialog
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        onConfirm={async () => {
          const m = deactivating;
          if (!m) return;
          setDeactivating(null);
          const ok = await run(
            () => toggleMemberStatusAction(m.memberId),
            m.status === "ACTIVE" ? `${m.name} deactivated` : `${m.name} reactivated`
          );
          void ok;
        }}
        title={
          deactivating?.status === "ACTIVE"
            ? `Deactivate ${deactivating?.name}?`
            : `Reactivate ${deactivating?.name}?`
        }
        description={
          deactivating?.status === "ACTIVE"
            ? "Deactivated members can't add hulog but their history stays."
            : "This re-enables the member to participate."
        }
        confirmLabel={deactivating?.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
        danger={deactivating?.status === "ACTIVE"}
        loading={busy}
      />

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          const m = removing;
          if (!m) return;
          setRemoving(null);
          await run(() => removeMemberAction(m.memberId), `${m.name} removed from the challenge`);
        }}
        title={`Remove ${removing?.name}?`}
        description={`This removes ${removing?.name} and all their hulog records from the challenge. This can't be undone.`}
        confirmLabel="Remove member"
        danger
        loading={busy}
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-mist px-2.5 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-ink-soft/50">{label}</p>
      <p className="truncate text-sm font-extrabold text-ink">{value}</p>
    </div>
  );
}

function RoundAction({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
        danger
          ? "text-ink-soft hover:bg-rose-50 hover:text-rose-600"
          : "text-ink-soft hover:bg-mist hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function MemberRowActions({
  member,
  onEdit,
  onHulog,
  onPassword,
  onToggle,
  onRemove,
}: {
  member: MemberRow;
  onEdit: () => void;
  onHulog: () => void;
  onPassword: () => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-mist hover:text-ink"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lift">
            <RowItem icon={Banknote} label="Record hulog" onClick={() => { setOpen(false); onHulog(); }} tone="brand" />
            <RowItem icon={Pencil} label="Edit member" onClick={() => { setOpen(false); onEdit(); }} />
            <RowItem icon={KeyRound} label="Reset password" onClick={() => { setOpen(false); onPassword(); }} />
            <RowItem
              icon={member.status === "ACTIVE" ? UserX : UserCheck}
              label={member.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
              onClick={() => { setOpen(false); onToggle(); }}
            />
            <RowItem icon={Trash2} label="Remove" danger onClick={() => { setOpen(false); onRemove(); }} />
          </div>
        </>
      )}
    </div>
  );
}

function RowItem({
  icon: Icon,
  label,
  onClick,
  danger,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
  tone?: "brand" | "default";
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-semibold transition-colors ${
        danger
          ? "text-rose-600 hover:bg-rose-50"
          : tone === "brand"
            ? "text-brand-700 hover:bg-brand-50"
            : "text-ink-soft hover:bg-mist"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function AddMembersModal({
  open,
  onClose,
  challengeId,
}: {
  open: boolean;
  onClose: () => void;
  challengeId: string;
}) {
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const router = useRouter();

  const save = async (fd: FormData) => {
    setSaving(true);
    const res = await addMembersAction(challengeId, null, fd);
    setSaving(false);
    if (res.ok) {
      toast("success", res.message ?? "Members added");
      router.refresh();
      onClose();
    } else {
      setError(res.error);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add members"
      description="One per line: email, Full Name. New members get a unique temporary password shown after adding."
      size="md"
    >
      <form action={save} className="flex flex-col gap-4">
        <Field label="Members" hint="Format: email, name">
          <Textarea
            name="members"
            rows={6}
            placeholder={"juan.dela.cruz@example.com, Juan Dela Cruz\nmaria.santos@example.com, Maria Santos"}
            autoFocus
          />
        </Field>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Add members</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditMemberModal({
  member,
  onClose,
}: {
  member: MemberRow | null;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(() => member?.name ?? "");
  const [email, setEmail] = React.useState(() => member?.email ?? "");
  const [phone, setPhone] = React.useState("");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const router = useRouter();

  if (!member) return null;

  const save = async () => {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("email", email);
    fd.set("phone", phone);
    setSaving(true);
    const res = await updateMemberProfileAction(member.userId, null, fd);
    setSaving(false);
    if (res.ok) {
      toast("success", "Member updated");
      router.refresh();
      onClose();
    } else {
      setError(res.error);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${member.name}`}
      description="Update their account details."
      size="sm"
    >
      <div className="flex flex-col gap-3.5">
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
          </div>
        </Field>
        <Field label="Phone (optional)">
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" placeholder="09xx xxx xxxx" />
          </div>
        </Field>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save changes</Button>
        </div>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({
  member,
  onClose,
}: {
  member: MemberRow | null;
  onClose: () => void;
}) {
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const router = useRouter();

  if (!member) return null;

  const save = async () => {
    const fd = new FormData();
    fd.set("password", password);
    setSaving(true);
    const res = await resetUserPasswordAction(member.userId, null, fd);
    setSaving(false);
    if (res.ok) {
      toast("success", "Password reset", res.message);
      router.refresh();
      onClose();
    } else {
      setError(res.error);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Reset password · ${member.name}`}
      description="Give this member a new temporary password."
      size="sm"
    >
      <div className="flex flex-col gap-3.5">
        <Field label="New password" hint="At least 6 characters. Share it with the member.">
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="temporary-password"
          />
        </Field>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Reset password</Button>
        </div>
      </div>
    </Modal>
  );
}

function RecordHulogForMember({
  challengeId,
  member,
  onClose,
}: {
  challengeId: string;
  member: MemberRow | null;
  onClose: () => void;
}) {
  const [kind, setKind] = React.useState<"hulog" | "withdraw">("hulog");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = React.useState("CASH");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const router = useRouter();
  const isWithdraw = kind === "withdraw";

  if (!member) return null;

  const save = async () => {
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("amount", amount);
    fd.set("date", date);
    fd.set("paymentMethod", method);
    fd.set("note", note);
    setSaving(true);
    const res = await recordHulogForMemberAction(challengeId, member.memberId, null, fd);
    setSaving(false);
    if (res.ok) {
      toast(
        "success",
        isWithdraw ? "Withdrawal recorded" : "Hulog recorded",
        `${isWithdraw ? "Withdrawal of ₱" : "₱"}${parseFloat(amount).toLocaleString(
          "en-PH"
        )} for ${member.name}`
      );
      router.refresh();
      onClose();
    } else {
      setError(res.error);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isWithdraw ? `Record withdrawal · ${member.name}` : `Record hulog · ${member.name}`}
      description={
        isWithdraw
          ? "Record a payout to this member. It reduces their hulog balance and is marked confirmed."
          : "Record a contribution on behalf of this member. It will be marked confirmed."
      }
      size="sm"
    >
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-2">
          {(["hulog", "withdraw"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-xl border px-3.5 py-2.5 text-sm font-bold transition-all ${
                kind === k
                  ? k === "withdraw"
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-line bg-white text-ink-soft hover:border-brand-200"
              }`}
            >
              {k === "withdraw" ? "Withdraw" : "Hulog"}
            </button>
          ))}
        </div>
        <Field label="Amount">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-brand-700">₱</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
              className="h-12 w-full rounded-xl border border-line bg-white pl-8 pr-3.5 text-xl font-bold text-ink outline-none focus:border-brand-400"
            />
          </div>
        </Field>
        <Field label="Date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-400"
          />
        </Field>
        <Field label="Payment Method">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-400"
          >
            {["CASH", "GCASH", "BANK_TRANSFER", "OTHER"].map((m) => (
              <option key={m} value={m}>{m.replace("_", " ")}</option>
            ))}
          </select>
        </Field>
        <Field label="Note (optional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
        </Field>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving} variant={isWithdraw ? "danger" : "primary"}>
            {isWithdraw ? "Save withdrawal" : "Save hulog"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}