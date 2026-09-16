import * as React from "react";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className = "", invalid, ...props }, ref) => (
  <input
    ref={ref}
    className={`h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-ink shadow-soft outline-none transition-all duration-200 placeholder:text-ink-soft/45 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 ${
      invalid ? "border-rose-400" : "border-line"
    } ${className}`}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = "", ...props }, ref) => (
  <textarea
    ref={ref}
    className={`min-h-24 w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm text-ink shadow-soft outline-none transition-all duration-200 placeholder:text-ink-soft/45 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 ${className}`}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className = "", children, ...props }, ref) => (
  <select
    ref={ref}
    className={`h-11 w-full appearance-none rounded-xl border border-line bg-white px-3.5 pr-9 text-sm text-ink shadow-soft outline-none transition-all duration-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-[13px] font-semibold text-ink">{label}</label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-soft/70">{hint}</p>
      ) : null}
    </div>
  );
}

export function AmountInput({
  value,
  onChange,
  placeholder = "0",
  autoFocus,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  id?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-brand-700">
        ₱
      </span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min="0.01"
        step="0.01"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-14 w-full rounded-xl border border-line bg-white pl-9 pr-4 text-2xl font-bold text-ink shadow-soft outline-none transition-all duration-200 placeholder:font-medium placeholder:text-ink-soft/30 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
      />
    </div>
  );
}