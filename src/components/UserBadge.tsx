// минимальный бейдж автора
export default function UserBadge({
  href,
  avatar,
  username,
  displayName,
  size = 28,
}: {
  href: string;
  avatar: string | null;
  username: string;
  displayName?: string | null;
  size?: number;
}) {
  const a = avatar || "/default-avatar.svg";
  return (
    <a href={href} className="inline-flex items-center gap-2 group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={a}
        alt={`${username} avatar`}
        className="rounded-full object-cover border border-neutral-700"
        style={{ width: size, height: size }}
      />
      <span className="text-sm">
        {displayName ? (
          <>
            <span className="opacity-95">{displayName}</span>{" "}
            <span className="opacity-60">@{username}</span>
          </>
        ) : (
          <span className="opacity-90">@{username}</span>
        )}
      </span>
    </a>
  );
}
