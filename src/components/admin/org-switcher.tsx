"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Building2 } from "lucide-react";
import { Select } from "@/components/ui/input";

export function OrgSwitcher({ orgs, current }: { orgs: { id: string; name: string }[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-2 rounded-2xl border border-line/70 bg-white px-3 py-2 shadow-soft">
      <Building2 className="h-4 w-4 shrink-0 text-ink-soft/60" />
      <Select
        value={current}
        onChange={(e) => {
          router.push(`${pathname}?org=${e.target.value}`);
          router.refresh();
        }}
        className="min-w-40 border-0 bg-transparent shadow-none"
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </Select>
    </label>
  );
}