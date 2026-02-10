import { resolveMediaUrl } from "@/lib/media";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: string; // optional
};

export default function AvatarImg({
  src,
  alt,
  className,
  fallback = "/default-avatar.svg",
}: Props) {
  const resolved = resolveMediaUrl(src) ?? fallback;

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolved} alt={alt} className={className} />;
}
