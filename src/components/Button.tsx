import type { ButtonHTMLAttributes } from "react";
import "./Button.css";

type ButtonVariant = "default" | "disabled" | "blue";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export default function Button({
  variant = "default",
  disabled = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || variant === "disabled";
  const resolvedVariant = isDisabled ? "disabled" : variant;
  const mergedClassName = ["app-button", `app-button--${resolvedVariant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={mergedClassName}
      {...props}
    />
  );
}
