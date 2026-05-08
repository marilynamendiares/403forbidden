import type { ReactNode } from "react";

export const AUTH_LABEL_CLASS =
  "header-font-archimoto block text-[12px] uppercase tracking-[0.12em] text-white/52";

export const AUTH_INPUT_CLASS =
  "h-13 w-full rounded-[6px] border border-white/8 bg-black/45 px-4 text-[18px] text-white placeholder:text-white/18 focus:border-white/16 focus:outline-none disabled:opacity-60";

export const AUTH_BUTTON_CLASS =
  "header-font-archimoto h-13 w-full rounded-[6px] border border-white/8 bg-white/14 px-4 text-[15px] uppercase tracking-[0.16em] text-white hover:bg-white/18 disabled:opacity-60";

export const AUTH_LINK_ROW_CLASS =
  "flex items-center justify-between gap-4 text-[12px] text-white/42";

export const AUTH_LINK_CLASS =
  "header-font-archimoto uppercase tracking-[0.08em] hover:text-white/72";

export default function AuthPanelShell({
  title,
  children,
  footer = "Encrypted mesh · Node EU-W3 · Protocol v2.1",
}: {
  title: string;
  children: ReactNode;
  footer?: string;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full items-center justify-center px-6 py-16">
      <div className="login-auth-panel-enter mx-auto flex w-full max-w-[420px] flex-col gap-6">
        <div className="-mt-10 flex justify-center pb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/globalbrand.gif"
            alt="403 Forbidden logo"
            className="login-auth-mark-enter h-[112px] w-[112px] object-contain opacity-95"
          />
        </div>

        <div className="h-px w-full bg-white/30" />

        <div className="header-font-archimoto text-center text-[13px] uppercase tracking-[0.22em] text-white/45">
          {title}
        </div>

        {children}

        <div className="space-y-5 pt-2">
          <div className="h-px w-full bg-white/30" />
          <p className="header-font-archimoto text-center text-[11px] uppercase tracking-[0.14em] text-white/36">
            {footer}
          </p>
        </div>
      </div>
    </div>
  );
}
