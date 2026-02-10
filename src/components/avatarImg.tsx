// src/components/avatarImg.tsx
"use client";

import { resolveMediaUrl } from "@/lib/media";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
  fallback?: string;
};

export default function AvatarImg({ src, fallback = "/default-avatar.svg", ...props }: Props) {
  const resolved = resolveMediaUrl(src) ?? fallback;

  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} src={resolved} />;
}
