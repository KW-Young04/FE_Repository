import {
  cloneElement,
  isValidElement,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";

interface WorkspaceTooltipTriggerProps {
  description: string;
  className?: string;
  children: ReactNode;
}

type TriggerElement = ReactElement<{
  onPointerEnter?: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (event: PointerEvent<HTMLElement>) => void;
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
}>;

function mergeHandler<E>(
  ours: (event: E) => void,
  theirs: ((event: E) => void) | undefined,
) {
  return (event: E) => {
    ours(event);
    theirs?.(event);
  };
}

export default function WorkspaceTooltipTrigger({
  description,
  className,
  children,
}: WorkspaceTooltipTriggerProps) {
  const [open, setOpen] = useState(false);

  const trigger =
    isValidElement(children) ?
      cloneElement(children as TriggerElement, {
        onPointerEnter: mergeHandler(
          () => setOpen(true),
          (children as TriggerElement).props.onPointerEnter,
        ),
        onPointerLeave: mergeHandler(
          () => setOpen(false),
          (children as TriggerElement).props.onPointerLeave,
        ),
        onPointerDown: mergeHandler(
          () => setOpen(false),
          (children as TriggerElement).props.onPointerDown,
        ),
        onFocus: mergeHandler((event) => {
          if (event.currentTarget.matches(":focus-visible")) {
            setOpen(true);
          }
        }, (children as TriggerElement).props.onFocus),
        onBlur: mergeHandler(
          () => setOpen(false),
          (children as TriggerElement).props.onBlur,
        ),
      })
    : children;

  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      {trigger}
      <span
        role="tooltip"
        className={[
          "pointer-events-none absolute left-1/2 top-[calc(100%+6px)] z-50 w-max max-w-[min(280px,calc(100vw-24px))] -translate-x-1/2 rounded-[5px] border border-slate-200 bg-white px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-slate-600 shadow-[0_4px_12px_rgba(15,23,42,0.12)] transition-opacity duration-150",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        {description}
      </span>
    </div>
  );
}
