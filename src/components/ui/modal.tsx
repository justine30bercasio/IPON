"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  footer,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }[size];

  const dialog = (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="animate-fade-in absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`animate-scale-in relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-lift ${widths} ${className}`}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-line/60 px-6 pb-4 pt-5">
            <div className="min-w-0">
              {title && (
                <h2 className="text-lg font-extrabold tracking-tight text-ink">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-sm text-ink-soft/80">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-ink-soft transition-colors hover:bg-slate-200 hover:text-ink"
              aria-label="Close"
            >
              <X className="h-4 w-4 transition-transform group-hover:rotate-90" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-line/60 bg-mist/50 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document === "undefined"
    ? null
    : createPortal(dialog, document.body);
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  loading,
  requireText,
  confirmHint,
  confirmPrefix,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  requireText?: string;
  confirmHint?: string;
  confirmPrefix?: string;
}) {
  const [typed, setTyped] = React.useState("");
  const unlocked = !requireText || typed === requireText;

  const handleClose = React.useCallback(() => {
    setTyped("");
    onClose();
  }, [onClose]);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button
            onClick={handleClose}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-full border border-line px-4 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !unlocked}
            className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
              danger ? "bg-rose-600 hover:bg-rose-700" : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-center gap-3.5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            danger ? "bg-rose-100 text-rose-600" : "bg-brand-50 text-brand-700"
          }`}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
            <path d="M10.3 3.9l-8 13.9A2 2 0 004.3 20.5h15.4a2 2 0 001.9-2.8l-8-13.9a2 2 0 00-3.5 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-ink">{title}</p>
          {description && (
            <p className="mt-0.5 text-sm text-ink-soft/80">{description}</p>
          )}
        </div>
      </div>
      {requireText && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft/60">
            {confirmHint ?? `Type "${requireText}" to confirm`}
          </p>
          <div className="relative flex items-center">
            {confirmPrefix && (
              <span className="pointer-events-none absolute left-3.5 text-sm font-semibold text-ink-soft/40">
                {confirmPrefix}
              </span>
            )}
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              className="h-10 w-full rounded-full border border-line bg-white px-3.5 text-sm font-medium text-ink outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
              style={confirmPrefix ? { paddingLeft: 60 } : undefined}
              placeholder={requireText}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}