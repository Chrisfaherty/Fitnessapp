"use client";
import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "icon";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

// Separate prop interface for motion.button usage (primary variant)
type MotionButtonProps = HTMLMotionProps<"button">;

const variantClasses: Record<Variant, string> = {
  primary:
    "h-10 px-4 bg-accent text-accent-foreground text-[14px] font-bold font-sans rounded-md " +
    "hover:bg-accent-strong disabled:bg-accent-muted disabled:text-accent-foreground/40 disabled:cursor-not-allowed " +
    "transition-colors duration-[160ms] ease-in-out",
  secondary:
    "h-10 px-4 bg-surface-elevated border border-border text-foreground text-[14px] font-medium font-sans rounded-md " +
    "hover:border-border-hover hover:bg-white/[0.03] " +
    "transition-colors duration-[160ms] ease-in-out",
  ghost:
    "h-9 px-3 bg-transparent text-foreground-secondary text-[14px] font-medium font-sans rounded-sm " +
    "hover:bg-white/[0.04] hover:text-foreground " +
    "transition-colors duration-[120ms] ease-in-out",
  danger:
    "h-10 px-4 bg-danger-muted border border-danger/24 text-danger text-[14px] font-medium font-sans rounded-md " +
    "hover:bg-danger/20 " +
    "transition-colors duration-[160ms] ease-in-out",
  icon:
    "w-9 h-9 bg-transparent rounded-sm flex items-center justify-center " +
    "hover:bg-surface-elevated " +
    "transition-colors duration-[120ms] ease-in-out",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 select-none focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size: _size,
      loading = false,
      icon,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const classes = [baseClasses, variantClasses[variant], className]
      .filter(Boolean)
      .join(" ");

    const isDisabled = disabled || loading;

    const inner = (
      <>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </>
    );

    if (variant === "primary") {
      // Cast props to motion-compatible type — both extend HTMLButtonElement attrs
      const motionProps = props as unknown as Omit<MotionButtonProps, "ref">;
      return (
        <motion.button
          ref={ref}
          className={classes}
          disabled={isDisabled}
          whileTap={isDisabled ? undefined : { scale: 0.97 }}
          {...motionProps}
        >
          {inner}
        </motion.button>
      );
    }

    return (
      <button ref={ref} className={classes} disabled={isDisabled} {...props}>
        {inner}
      </button>
    );
  }
);

Button.displayName = "Button";
