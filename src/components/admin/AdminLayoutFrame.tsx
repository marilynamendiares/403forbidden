import ShellScrollModeSetter from "@/app/shell/ShellScrollMode";
import ShellVariantSetter from "@/app/shell/ShellVariant";
import AdminNav from "@/components/admin/AdminNav";
import AdminRailLinks from "@/components/admin/AdminRailLinks";

type RailItem = {
  href: string;
  label: string;
  count: number;
  detail: string;
  active?: boolean;
};

export default function AdminLayoutFrame({
  currentPath,
  eyebrow,
  title,
  subtitle,
  railItems,
  children,
}: {
  currentPath: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  railItems: RailItem[];
  children: React.ReactNode;
}) {
  return (
    <>
      <ShellScrollModeSetter mode="split" />
      <ShellVariantSetter variant="full" />

      <div className="relative h-full min-h-0 overflow-hidden">
        <div
          className="grid h-full min-h-0 gap-0 overflow-hidden"
          style={{ gridTemplateColumns: "minmax(0, 1fr) var(--right-rail-w)" }}
        >
          <div className="scrollbar-hidden h-full min-h-0 overflow-y-auto pb-10 pt-[72px]">
            <div className="mx-auto max-w-[1280px] space-y-6 px-4">
              <header className="rounded-2xl border border-neutral-900 bg-neutral-950/50 px-5 py-5 shadow-[0_0_0_1px_rgba(255,255,255,0.01)]">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                  <div className="max-w-3xl space-y-2">
                    {eyebrow ? (
                      <div className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">{eyebrow}</div>
                    ) : null}
                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
                    {subtitle ? <p className="text-sm leading-6 text-neutral-400 md:text-[15px]">{subtitle}</p> : null}
                  </div>
                  <div className="xl:min-w-[420px]">
                    <AdminNav currentPath={currentPath} />
                  </div>
                </div>
              </header>

              <div className="space-y-6">{children}</div>
            </div>
          </div>

          <aside className="scrollbar-hidden h-full min-h-0 overflow-y-auto border-l border-white/10 pb-10 pl-[72px] pr-[72px] pt-[72px]">
            <AdminRailLinks
              title="Control Links"
              subtitle="Primary admin destinations with live counts."
              items={railItems}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
