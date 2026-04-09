// src/components/avatarImg.tsx
"use client";

import { resolveMediaUrl } from "@/lib/media";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string; // null запрещаем — будет undefined
  fallback?: string;
};


export default function AvatarImg({ src, fallback = "/default-avatar.jpg", ...props }: Props) {
  const resolved = resolveMediaUrl(src) ?? fallback;

  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} src={resolved} />;
}
