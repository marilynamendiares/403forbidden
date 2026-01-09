"use client";

import React from "react";

export default function ConfirmSubmitButton(props: {
  children: React.ReactNode;
  confirmText: string;
  className?: string;
}) {
  const { children, confirmText, className } = props;

  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
