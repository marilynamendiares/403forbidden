"use client";

import { signOut } from "next-auth/react";

export default function HomeSignOutButton() {
  return (
    <button
      type="button"
      onClick={() => void signOut()}
      className="header-font-archimoto text-[15px] leading-none uppercase text-slate-500 hover:text-slate-200"
    >
      sign out
    </button>
  );
}
