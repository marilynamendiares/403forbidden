// src/components/ui/IconButton.tsx
import * as React from "react";

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Пока один вариант, но можно будет добавить "solid", "ghost" и т.п. */
  variant?: "glass";
};

export function IconButton({
  children,
  className,
  variant = "glass",
  type = "button",
  ...props
}: IconButtonProps) {
  const baseClass =
    variant === "glass" ? "ui-icon-button-glass" : "";

  const finalClass =
    baseClass + (className ? ` ${className}` : "");

  return (
    <button type={type} className={finalClass} {...props}>
      {children}
    </button>
  );
}
