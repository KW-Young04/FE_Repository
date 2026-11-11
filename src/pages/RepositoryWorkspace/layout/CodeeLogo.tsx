interface CodeeLogoProps {
  size?: "sm" | "lg";
}

const sizeStyles = {
  sm: {
    gap: "gap-[7px]",
    mark: "size-[29px]",
    text: "w-[77px]",
  },
  lg: {
    gap: "gap-3",
    mark: "size-14 md:size-16",
    text: "w-40 md:w-48",
  },
} as const;

export default function CodeeLogo({ size = "sm" }: CodeeLogoProps) {
  const styles = sizeStyles[size];

  return (
    <div className={`flex items-center ${styles.gap}`}>
      <img src="/codee.png" alt="" className={`block object-contain ${styles.mark}`} />
      <img src="/codee-text.png" alt="Codee" className={`block h-auto object-contain ${styles.text}`} />
    </div>
  );
}
