import AdminNav from "@/components/admin/AdminNav";

export default function AdminPageShell({
  currentPath,
  title,
  subtitle,
  eyebrow,
  children,
}: {
  currentPath: string;
  title: string;
  subtitle: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-10">
      <header className="rounded-2xl border border-neutral-900 bg-neutral-950/50 px-5 py-5 shadow-[0_0_0_1px_rgba(255,255,255,0.01)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-2">
            {eyebrow ? (
              <div className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">{eyebrow}</div>
            ) : null}
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
            <p className="text-sm leading-6 text-neutral-400 md:text-[15px]">{subtitle}</p>
          </div>
          <div className="xl:min-w-[320px] xl:max-w-[420px]">
            <AdminNav currentPath={currentPath} />
          </div>
        </div>
      </header>

      <div className="space-y-6">{children}</div>
    </div>
  );
}
