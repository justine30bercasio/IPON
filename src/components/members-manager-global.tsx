"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  KeyRound,
  Search,
  Users,
  Plus,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  updateMemberProfileAction,
  resetUserPasswordAction,
  adminAddMembersAction,
  toggleUserRoleAction,
  toggleUserActiveAction,
  deleteUserAction,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input, Field, Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { TablePagination } from "@/components/ui/table-pagination";
import { toast } from "@/components/ui/toast";

export interface GlobalMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  challengeCount: number;
  challengeNames: string[];
}

export function MembersManager({
  members,
  currentUserId,
}: {
  members: GlobalMember[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [editing, setEditing] = React.useState<GlobalMember | null>(null);
  const [resetting, setResetting] = React.useState<GlobalMember | null>(null);
  const [deactivating, setDeactivating] = React.useState<GlobalMember | null>(null);
  const [deleting, setDeleting] = React.useState<GlobalMember | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 10;

  const filtered = members.filter((m) => {
    const needle = q.toLowerCase();
    return (
      !needle ||
      m.name.toLowerCase().includes(needle) ||
      m.email.toLowerCase().includes(needle)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const saveProfile = async () => {
    if (!editing) return;
    const fd = new FormData();
    fd.set("name", name);
    fd.set("email", email);
    fd.set("phone", phone);
    setBusy(true);
    const res = await updateMemberProfileAction(editing.id, null, fd);
    setBusy(false);
    if (res.ok) {
      toast("success", "Member updated", res.message);
      setEditing(null);
      router.refresh();
    } else {
      toast("error", "Couldn't update", res.error);
    }
  };

  const resetPassword = async () => {
    if (!resetting) return;
    const fd = new FormData();
    fd.set("password", password);
    setBusy(true);
    const res = await resetUserPasswordAction(resetting.id, null, fd);
    setBusy(false);
    if (res.ok) {
      toast("success", "Password reset", res.message);
      setResetting(null);
      setPassword("");
    } else {
      toast("error", "Couldn't reset", res.error);
    }
  };

  const toggleRole = async (m: GlobalMember) => {
    setBusy(true);
    const res = await toggleUserRoleAction(m.id);
    setBusy(false);
    if (res.ok) {
      toast("success", "Role updated", res.message);
      router.refresh();
    } else {
      toast("error", "Couldn't update role", res.error);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivating) return;
    setBusy(true);
    const res = await toggleUserActiveAction(deactivating.id);
    setBusy(false);
    setDeactivating(null);
    if (res.ok) {
      toast("success", "Account updated", res.message);
      router.refresh();
    } else {
      toast("error", "Couldn't update account", res.error);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const res = await deleteUserAction(deleting.id);
    setBusy(false);
    setDeleting(null);
    if (res.ok) {
      toast("success", "User deleted", res.message);
      router.refresh();
    } else {
      toast("error", "Couldn't delete", res.error);
    }
  };

  const self = (id: string) => id === currentUserId;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/40" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email…"
            className="pl-10"
          />
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add member
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line/70 bg-white shadow-soft">
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line/70 bg-mist/60 text-[11px] uppercase tracking-wider text-ink-soft/60">
                <th className="px-5 py-3 text-left font-bold">Member</th>
                <th className="px-5 py-3 text-left font-bold">Role</th>
                <th className="px-5 py-3 text-left font-bold">Challenges</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((m) => (
                <tr key={m.id} className="border-b border-line/40 last:border-0 hover:bg-mist/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-ink">{m.name}</p>
                        <p className="truncate text-xs text-ink-soft/70">{m.email}</p>
                      </div>
                    </div>
                  </td>
                   <td className="px-5 py-3">
                     <Badge tone={m.role === "SUPER_ADMIN" ? "primary" : m.role === "ADMIN" ? "primary" : "neutral"}>
                       {m.role === "SUPER_ADMIN" ? "Super Admin" : m.role === "ADMIN" ? "Admin" : "Member"}
                     </Badge>
                   </td>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-ink">{m.challengeCount}</p>
                    <p className="max-w-40 truncate text-xs text-ink-soft/60">
                      {m.challengeNames.join(", ") || "—"}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Badge tone={m.isActive ? "success" : "neutral"}>
                      {m.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      {m.role !== "SUPER_ADMIN" && (
                        <button
                          onClick={() => toggleRole(m)}
                          disabled={self(m.id) || busy}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft/60 transition-colors enabled:hover:bg-indigo-50 enabled:hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                          title={
                            self(m.id)
                              ? "This is you"
                              : m.role === "ADMIN"
                                ? "Demote to member"
                                : "Make admin"
                          }
                        >
                          {m.role === "ADMIN" ? (
                            <ShieldOff className="h-4 w-4" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditing(m);
                          setName(m.name);
                          setEmail(m.email);
                          setPhone(m.phone ?? "");
                        }}
                        disabled={m.role === "SUPER_ADMIN"}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft/60 transition-colors enabled:hover:bg-brand-50 enabled:hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                        title={m.role === "SUPER_ADMIN" ? "Super admin profiles are locked" : "Edit profile"}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setResetting(m);
                          setPassword("");
                        }}
                        disabled={m.role === "SUPER_ADMIN"}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft/60 transition-colors enabled:hover:bg-amber-50 enabled:hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                        title={m.role === "SUPER_ADMIN" ? "Super admin password can't be reset" : "Reset password"}
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeactivating(m)}
                        disabled={self(m.id) || busy || m.role === "SUPER_ADMIN"}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft/60 transition-colors enabled:hover:bg-slate-100 enabled:hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        title={
                          self(m.id)
                            ? "This is you"
                            : m.role === "SUPER_ADMIN"
                              ? "Super admins can't be deactivated"
                              : m.isActive
                                ? "Set inactive"
                                : "Re-activate"
                        }
                      >
                        {m.isActive ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setDeleting(m)}
                        disabled={self(m.id) || busy || m.role === "SUPER_ADMIN"}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft/60 transition-colors enabled:hover:bg-rose-50 enabled:hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                        title={self(m.id) ? "This is you" : m.role === "SUPER_ADMIN" ? "Super admins can't be deleted" : "Delete user"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-1.5 p-3 sm:hidden">
          {pageRows.map((m) => (
            <div key={m.id} className="rounded-xl border border-line/60 p-3">
              <div className="flex items-center gap-3">
                <Avatar name={m.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{m.name}</p>
                  <p className="truncate text-xs text-ink-soft/70">{m.email}</p>
                </div>
                <Badge tone={m.role === "SUPER_ADMIN" ? "primary" : m.role === "ADMIN" ? "primary" : "neutral"}>
                  {m.role === "SUPER_ADMIN" ? "Super Admin" : m.role === "ADMIN" ? "Admin" : "Member"}
                </Badge>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-ink-soft/60">
                  {m.challengeCount} challenge{m.challengeCount === 1 ? "" : "s"} ·{" "}
                  <span className={m.isActive ? "text-emerald-600" : "text-ink-soft/50"}>
                    {m.isActive ? "Active" : "Inactive"}
                  </span>
                </p>
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={() => toggleRole(m)}
                    disabled={self(m.id) || busy || m.role === "SUPER_ADMIN"}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 enabled:hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                    title={
                      self(m.id)
                        ? "This is you"
                        : m.role === "SUPER_ADMIN"
                          ? "Super admins can't be demoted"
                          : m.role === "ADMIN"
                            ? "Demote to member"
                            : "Make admin"
                    }
                  >
                    {m.role === "ADMIN" ? (
                      <ShieldOff className="h-3.5 w-3.5" />
                    ) : (
                      <Shield className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(m);
                      setName(m.name);
                      setEmail(m.email);
                      setPhone(m.phone ?? "");
                    }}
                    disabled={m.role === "SUPER_ADMIN"}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-mist text-ink-soft/70 enabled:hover:bg-brand-50 enabled:hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                    title={m.role === "SUPER_ADMIN" ? "Super admin profiles are locked" : "Edit profile"}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setResetting(m);
                      setPassword("");
                    }}
                    disabled={m.role === "SUPER_ADMIN"}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-700 enabled:hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                    title={m.role === "SUPER_ADMIN" ? "Super admin password can't be reset" : "Reset password"}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeactivating(m)}
                    disabled={self(m.id) || busy || m.role === "SUPER_ADMIN"}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 enabled:hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                    title={self(m.id) ? "This is you" : m.role === "SUPER_ADMIN" ? "Super admins can't be deactivated" : m.isActive ? "Set inactive" : "Re-activate"}
                  >
                    {m.isActive ? (
                      <UserX className="h-3.5 w-3.5" />
                    ) : (
                      <UserCheck className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => setDeleting(m)}
                    disabled={self(m.id) || busy || m.role === "SUPER_ADMIN"}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-700 enabled:hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                    title={self(m.id) ? "This is you" : m.role === "SUPER_ADMIN" ? "Super admins can't be deleted" : "Delete user"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-3 pt-2">
          <TablePagination
            page={safePage}
            totalPages={totalPages}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPage={setPage}
          />
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Users className="h-8 w-8 text-ink-soft/30" />
            <p className="text-sm font-bold text-ink">No members found</p>
            <p className="text-xs text-ink-soft/70">Try a different search.</p>
          </div>
        )}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit member" size="md">
        <div className="flex flex-col gap-4">
          <Field label="Full Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 9xx xxx xxxx" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveProfile} loading={busy}>Save changes</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!resetting} onClose={() => setResetting(null)} title="Reset password" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            Set a new password for <span className="font-bold text-ink">{resetting?.name}</span>.
          </p>
          <Field label="New Password">
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft/60 hover:bg-mist hover:text-ink"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setResetting(null)}>Cancel</Button>
            <Button onClick={resetPassword} loading={busy} variant="secondary">
              <KeyRound className="h-4 w-4" /> Set password
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        onConfirm={confirmDeactivate}
        title={deactivating?.isActive ? `Deactivate ${deactivating?.name}?` : `Re-activate ${deactivating?.name}?`}
        description={
          deactivating?.isActive
            ? "They will be locked out immediately and won't be able to sign in until you re-activate them. Their data and hulog history are kept."
            : "They will be able to sign in again with their existing account and data."
        }
        confirmLabel={deactivating?.isActive ? "Deactivate" : "Re-activate"}
        danger={!!deactivating?.isActive}
        loading={busy}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title={`Permanently delete ${deleting?.name}?`}
        description={
          <>
            This <span className="font-bold">cannot be undone</span>. It permanently removes their
            membership, all of their transactions (hulog history), notifications, and any
            challenges they created.
          </>
        }
        confirmLabel="Delete user"
        danger
        loading={busy}
        requireText="DELETE"
        confirmHint="Type DELETE to confirm"
      />

      <AddMembersModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function AddMembersModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const save = async (fd: FormData) => {
    setSaving(true);
    const res = await adminAddMembersAction(null, fd);
    setSaving(false);
    if (res.ok) {
      toast("success", res.message ?? "Members created");
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
      title="Add member"
      description="One per line: email, Full Name. New accounts get a unique temporary password shown after adding."
      size="md"
    >
      <form action={save} className="flex flex-col gap-4">
        <Field label="Members" hint="Format: email, name">
          <Textarea
            name="members"
            rows={6}
            placeholder={"jane.doe@gmail.com, Jane Doe\njohn.cruz@gmail.com, John Cruz"}
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