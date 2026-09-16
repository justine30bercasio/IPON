"use client";

import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/actions";

export function MarkAllReadButton({ action }: { action: () => Promise<ActionResult> }) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        const res = await action();
        if (res.ok) {
          toast("success", "All caught up");
          router.refresh();
        } else {
          toast("error", "Couldn't update", res.error);
        }
      }}
    >
      <CheckCheck className="h-4 w-4" /> Mark all read
    </Button>
  );
}