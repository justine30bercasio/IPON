"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Banknote, Smartphone, Landmark, Wallet, CalendarDays } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, AmountInput, Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { addHulogAction, type ActionResult } from "@/lib/actions";

const initial: ActionResult = { ok: false, error: "" };

function todayValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const paymentOptions = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "GCASH", label: "GCash", icon: Smartphone },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Landmark },
  { value: "OTHER", label: "Other", icon: Wallet },
];

export type ChallengeOption = {
  id: string;
  name: string;
  members?: { id: string; name: string }[];
};

export function AddHulogModal({
  open,
  onClose,
  challenges,
  initialChallengeId,
  isAdmin,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  challenges: ChallengeOption[];
  initialChallengeId?: string;
  isAdmin?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [kind, setKind] = React.useState<"hulog" | "withdraw">("hulog");
  const [challengeId, setChallengeId] = React.useState(
    initialChallengeId ?? challenges[0]?.id ?? ""
  );
  const [memberId, setMemberId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(todayValue());
  const [method, setMethod] = React.useState("CASH");
  const isWithdraw = kind === "withdraw";

  const activeChallenge = challenges.find((c) => c.id === challengeId);
  const members = activeChallenge?.members ?? [];

  const boundAction = React.useCallback(
    (prev: ActionResult, fd: FormData) => addHulogAction(challengeId, prev, fd),
    [challengeId]
  );

  const [state, formAction, pending] = useActionState(boundAction, initial);

  React.useEffect(() => {
    if (state.ok) {
      toast("success", isAdmin ? "Hulog recorded!" : "Hulog submitted!", state.message);
      router.refresh();
      onDone?.();
    }
  }, [state, router, onDone, isAdmin]);

  const canSubmit =
    challengeId && parseFloat(amount) > 0 && !pending && (!isWithdraw || !!memberId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isWithdraw ? "Record Withdrawal" : "Add Hulog"}
      description={
        isWithdraw
          ? "Record money paid out to a member. It reduces their hulog balance."
          : isAdmin
            ? "Record your contribution. Any amount counts. It's counted right away."
            : "Record your contribution. Any amount counts. It will be counted once the organizer confirms it."
      }
    >
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="kind" value={kind} />
        {isAdmin && (
          <Field label="Type" hint="Choose what you're recording.">
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
          </Field>
        )}
        {challenges.length > 1 && (
          <Field label="Challenge" hint="Choose which challenge this hulog is for.">
            <Select
              value={challengeId}
              onChange={(e) => {
                const next = e.target.value;
                setChallengeId(next);
                setMemberId(
                  challenges.find((c) => c.id === next)?.members?.[0]?.id ?? ""
                );
              }}
            >
              {challenges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {isAdmin && members.length > 0 && (
          <Field
            label="Record for member"
            hint={
              isWithdraw
                ? "The member receiving this payout."
                : "The person who contributed this hulog."
            }
          >
            <input type="hidden" name="memberId" value={memberId} />
            <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Amount">
          <input type="hidden" name="amount" value={amount} />
          <AmountInput value={amount} onChange={setAmount} autoFocus />
          {!state.ok && state.error && (
            <p className="text-xs font-medium text-rose-600">{state.error}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {[100, 500, 1000, 2000, 5000].map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => setAmount(String(quick))}
                className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100"
              >
                ₱{quick >= 1000 ? `${quick / 1000}k` : quick.toLocaleString("en-PH")}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Date" hint="The collection date this hulog belongs to.">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
            <input
              type="date"
              name="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3.5 text-sm text-ink shadow-soft outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
            />
          </div>
        </Field>

        <Field label="Payment Method" hint="How did you hand over the hulog?">
          <div className="grid grid-cols-2 gap-2">
            {paymentOptions.map((opt) => {
              const Icon = opt.icon;
              const isChecked = method === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all ${
                    isChecked
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-line bg-white text-ink-soft hover:border-brand-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={opt.value}
                    checked={isChecked}
                    onChange={() => setMethod(opt.value)}
                    className="sr-only"
                  />
                  <Icon className="h-4.5 w-4.5" />
                  {opt.label}
                </label>
              );
            })}
          </div>
        </Field>

        <Field label="Note (optional)">
          <Textarea
            name="note"
            placeholder={
              isWithdraw
                ? "e.g. BILLYSON withdrew his full ipon (June 2026)"
                : "e.g. September hulog, GCash received by Justine"
            }
            rows={2}
            className="min-h-16"
          />
        </Field>

        <div className="mt-1 flex items-center justify-end gap-3">
          {!state.ok && state.error && (
            <p className="flex-1 text-xs font-medium text-rose-600">{state.error}</p>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={pending}
            disabled={!canSubmit}
            className="min-w-32"
            variant={isWithdraw ? "danger" : "primary"}
          >
            {isWithdraw ? "Submit Withdrawal" : "Submit Hulog"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}