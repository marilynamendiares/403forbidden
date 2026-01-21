export default function CornerArrow({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "pointer-events-none absolute right-1 top-1",
        // размер: ~50% высоты плитки (под твои карточки)
        "h-10 w-10 sm:h-12 sm:w-12",
        "text-white/20 group-hover:text-white/90",
        "transition-colors duration-200",
        className,
      ].join(" ")}
    >
      {/* Arrow only (no square), matching the reference shape */}
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <path
          fill="currentColor"
          d="
            M 44 14
            H 22
            V 22
            H 36.4
            L 16.6 41.8
            L 22.2 47.4
            L 42 27.6
            V 42
            H 50
            V 14
            Z
          "
        />
      </svg>
    </span>
  );
}
