import type React from "react";
import type { ShellScrollMode } from "@/app/shell/ShellScrollMode";
import type { ShellVariant } from "@/app/shell/ShellVariantContext";

type Props = {
  scrollMode: ShellScrollMode;
  variant: ShellVariant;
  children: React.ReactNode;
};

export default function ShellPanelBody({ scrollMode, variant, children }: Props) {
  return (
    <div
      className={[
        "flex-1 overflow-x-hidden",
        scrollMode === "split" ? "overflow-y-visible" : "overflow-y-auto",
      ].join(" ")}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns:
            variant === "full"
              ? "minmax(0, 1fr)"
              : "minmax(0, 1fr) var(--right-rail-w)",
          minHeight: scrollMode === "split" ? "100%" : "calc(100vh - var(--topbar-h))",
          height: scrollMode === "split" ? "100%" : undefined,
        }}
      >
        <main
          className={[
            "min-w-0 px-18 pb-10",
            scrollMode === "split" ? "h-full min-h-0 overflow-visible" : "",
          ].join(" ")}
          style={{
            paddingTop: scrollMode === "split" ? "0px" : "72px",
            paddingLeft: scrollMode === "split" ? "0px" : "72px",
            paddingRight: "72px",
          }}
        >
          {children}
        </main>

        {variant === "center" ? (
          <aside
            className="overflow-hidden border-l border-white/10"
            style={{ width: "var(--right-rail-w)" }}
          />
        ) : null}
      </div>
    </div>
  );
}
