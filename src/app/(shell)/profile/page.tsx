import { redirect } from "next/navigation";

export default async function ProfilePage() {
  // Legacy alias: canonical editable profile route now lives under /profile/settings.
  redirect("/profile/settings");
}
