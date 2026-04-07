import { redirect } from "next/navigation";

export default async function LegacyProfileSettingsPage() {
  redirect("/profile/settings");
}
