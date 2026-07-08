"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

const variants = {
  primary:
    "bg-brand-navy text-white hover:bg-brand-navy-light shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200",
  gold: "bg-brand-gold text-brand-navy hover:bg-brand-gold-light shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200",
  outline:
    "border-2 border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white transition-all duration-200",
  ghost:
    "text-brand-navy hover:bg-brand-navy/5 transition-colors duration-200",
  danger:
    "bg-accent-error text-white hover:bg-red-600 shadow-md active:scale-[0.98] transition-all duration-200",
};

const sizes = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-5 text-base rounded-xl",
  lg: "h-13 px-8 text-lg rounded-xl",
  xl: "h-15 px-10 text-lg rounded-2xl",
};

type ButtonVariant = keyof typeof variants;
type ButtonSize = keyof typeof sizes;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize };
