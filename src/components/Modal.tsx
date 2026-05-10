import type { ReactNode } from "react";

type ModalSize = "sm" | "md" | "lg";

interface ModalProps {
  isOpen: boolean;
  children: ReactNode;
  size?: ModalSize;
  onBackdropClick?: () => void;
  panelClassName?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
};

export default function Modal({
  isOpen,
  children,
  size = "md",
  onBackdropClick,
  panelClassName,
}: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onBackdropClick}
    >
      <div
        className={[
          "w-full rounded-2xl border border-slate-200 bg-white shadow-2xl",
          sizeClasses[size],
          panelClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
