import * as React from "react";

const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

const buttonVariants = {
  primary:
    "bg-brand-600 text-white shadow-glow hover:bg-brand-700 hover:shadow-lift",
  secondary:
    "bg-white text-ink border border-line shadow-soft hover:border-brand-300 hover:text-brand-700",
  outline:
    "bg-transparent text-brand-700 border border-brand-300 hover:bg-brand-50",
  ghost: "bg-transparent text-ink-soft hover:bg-brand-50 hover:text-ink",
  danger: "bg-rose-600 text-white shadow-soft hover:bg-rose-700",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
} as const;

const buttonSizes = {
  xs: "h-8 px-3 text-xs",
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base py-3.5",
  iconSm: "h-9 w-9 p-0",
  icon: "h-11 w-11 p-0",
} as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  loading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <Spinner className="h-4 w-4" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export const Spinner = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-90"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);