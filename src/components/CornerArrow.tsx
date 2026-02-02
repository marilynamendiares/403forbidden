// src/components/CornerArrow.tsx
type Props = {
  className?: string;
  /** right = как сейчас; left = для back */
  direction?: "right" | "left";
  /**
   * corner = как сейчас (absolute top-right в карточках)
   * inline = просто иконка без абсолютного позиционирования (для hero/back)
   */
  variant?: "corner" | "inline";
};

export default function CornerArrow({
  className = "",
  direction = "right",
  variant = "corner",
}: Props) {
  const isRight = direction === "right";

  const wrapperBase =
    variant === "corner"
      ? [
          "pointer-events-none absolute right-1 top-1",
          // размер: ~50% высоты плитки (под твои карточки)
          "h-10 w-10 sm:h-12 sm:w-12",
          "text-white/20 group-hover:text-white/90",
          "transition-colors duration-200",
        ].join(" ")
      : [
          "inline-flex",
          "h-12 w-12",
          "text-white/90 hover:text-white",
          "transition-colors duration-200",
        ].join(" ");

  return (
    <span
      aria-hidden="true"
      className={[wrapperBase, className].join(" ")}
      style={{
        transform: isRight ? "scaleX(-1)" : undefined,
      }}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <path
          fill="currentColor"
d="
  M 14 14
  H 50
  V 26
  H 34
L 50 42
L 50 50
L 42 50
  L 26 34
  V 50
  H 14
  Z
"


        />
      </svg>
    </span>
  );
}
