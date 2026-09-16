"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

const TOAST_EVENT = "ipon:toast";

export function toast(kind: ToastKind, title: string, message?: string) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { kind, title, message } }));
}

const icons: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-brand-600" />,
  error: <AlertCircle className="h-5 w-5 text-rose-600" />,
  info: <Info className="h-5 w-5 text-sky-600" />,
};

const tones: Record<ToastKind, string> = {
  success: "border-l-brand-500",
  error: "border-l-rose-500",
  info: "border-l-sky-500",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { kind: ToastKind; title: string; message?: string };
      const id = ++idRef.current;
      setItems((prev) => [...prev, { id, ...detail }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, []);

  return (
    <>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex flex-col items-center gap-2.5 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={`animate-fade-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-white/95 p-4 shadow-lift backdrop-blur border-l-4 ${tones[t.kind]}`}
          >
            <span className="mt-0.5 shrink-0">{icons[t.kind]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">{t.title}</p>
              {t.message && (
                <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">{t.message}</p>
              )}
            </div>
            <button
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              className="shrink-0 rounded-full p-1 text-ink-soft/60 hover:bg-mist hover:text-ink"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}