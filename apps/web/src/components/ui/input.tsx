"use client";
import { forwardRef } from "react";

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ children, required, className = "", ...props }: LabelProps) {
  return (
    <label
      className={`text-label text-foreground-secondary mb-2 block ${className}`}
      {...props}
    >
      {children}
      {required && (
        <span className="text-danger ml-0.5" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

// ---------------------------------------------------------------------------
// HelperText
// ---------------------------------------------------------------------------
interface HelperTextProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function HelperText({ children, className = "", ...props }: HelperTextProps) {
  return (
    <p className={`text-caption text-foreground-tertiary mt-2 ${className}`} {...props}>
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// ErrorText
// ---------------------------------------------------------------------------
interface ErrorTextProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function ErrorText({ children, className = "", ...props }: ErrorTextProps) {
  return (
    <p className={`text-caption text-danger mt-2 ${className}`} {...props}>
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const inputBase =
  "h-11 w-full bg-surface border text-foreground text-body rounded-md px-[14px] " +
  "placeholder:text-foreground-disabled " +
  "outline-none " +
  "transition-all duration-[160ms] ease-[ease]";

const inputNormal =
  "border-border hover:border-border-hover " +
  "focus:border-accent/55 focus:shadow-[0_0_0_3px_rgba(163,255,18,0.12)]";

const inputError =
  "border-danger/55 shadow-[0_0_0_3px_rgba(255,69,58,0.12)]";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, className = "", ...props }, ref) => {
    const stateClasses = error ? inputError : inputNormal;
    return (
      <input
        ref={ref}
        className={[inputBase, stateClasses, className].filter(Boolean).join(" ")}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

// ---------------------------------------------------------------------------
// Textarea
// ---------------------------------------------------------------------------
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const textareaBase =
  "w-full min-h-[120px] bg-surface border text-foreground text-body rounded-md px-[14px] py-3 resize-y " +
  "placeholder:text-foreground-disabled " +
  "outline-none " +
  "transition-all duration-[160ms] ease-[ease]";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error = false, className = "", ...props }, ref) => {
    const stateClasses = error ? inputError : inputNormal;
    return (
      <textarea
        ref={ref}
        className={[textareaBase, stateClasses, className].filter(Boolean).join(" ")}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

// ---------------------------------------------------------------------------
// FormField
// ---------------------------------------------------------------------------
interface FormFieldProps {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  helperText,
  error,
  required,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {error ? (
        <ErrorText>{error}</ErrorText>
      ) : helperText ? (
        <HelperText>{helperText}</HelperText>
      ) : null}
    </div>
  );
}
