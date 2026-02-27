// src/app/(full)/layout.tsx
export default function FullLayout({ children }: { children: React.ReactNode }) {
  return <main className="w-full">{children}</main>;
}
