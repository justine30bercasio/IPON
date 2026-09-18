"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function SignOutButton({
  variant = "icon",
}: {
  variant?: "icon" | "full";
}) {
  const router = useRouter();
  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } catch {
      /* ignore */
    }
    router.push("/login?loggedOut=1");
  };

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={signOut}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={signOut}
      aria-label="Sign out"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-soft shadow-soft transition-colors hover:text-ink"
    >
      <LogOut className="h-[18px] w-[18px]" />
    </button>
  );
}