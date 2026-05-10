import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "default" | "disabled" | "blue";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-slate-900 border-slate-900 text-white hover:bg-slate-800 hover:border-slate-800 cursor-pointer",
  blue: "bg-sky-500 border-sky-500 text-white hover:bg-sky-600 hover:border-sky-600 cursor-pointer",
  disabled:
    "bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed",
};

export default function Button({
  variant = "default",
  disabled = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || variant === "disabled";
  const resolvedVariant = isDisabled ? "disabled" : variant;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center border font-bold leading-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300",
        variantClasses[resolvedVariant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
