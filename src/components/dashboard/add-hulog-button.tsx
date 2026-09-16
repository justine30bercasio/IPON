"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddHulogModal, type ChallengeOption } from "@/components/add-hulog-modal";

export function AddHulogButton({
  challenges,
  initialChallengeId,
  isAdmin,
  className = "",
  size = "lg",
  label = "Add Hulog",
}: {
  challenges: ChallengeOption[];
  initialChallengeId?: string;
  isAdmin?: boolean;
  className?: string;
  size?: "md" | "lg";
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size={size} onClick={() => setOpen(true)} className={className}>
        <Plus className="h-4.5 w-4.5" />
        {label}
      </Button>
      <AddHulogModal
        key={open ? "open" : "closed"}
        open={open}
        onClose={() => setOpen(false)}
        challenges={challenges}
        initialChallengeId={initialChallengeId}
        isAdmin={isAdmin}
        onDone={() => setOpen(false)}
      />
    </>
  );
}