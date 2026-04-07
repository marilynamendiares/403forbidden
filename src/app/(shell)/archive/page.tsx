// Legacy alias: archive is no longer a standalone shell module.
import { redirect } from "next/navigation";

export default function ArchivePage() {
  redirect("/world");
}
