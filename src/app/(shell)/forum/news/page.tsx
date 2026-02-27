import Link from "next/link";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";


export default function NewsIndex() {
  return (
    <div className="space-y-6">
      <div>
        <BackButton fallbackHref="/forum" />
        <h1 className="text-2xl font-semibold mt-2">Broadcasts</h1>
        <p className="text-sm opacity-70 mt-1">System announcements and bulletins.</p>
      </div>

      <div className="grid gap-3">
        <Link className="border border-white/10 rounded-2xl p-5 bg-white/2 hover:bg-white/4 transition" href="/forum/news/public">
          <div className="text-sm font-semibold">Announcements (Public)</div>
          <p className="text-sm opacity-70 mt-1">Official updates visible to everyone.</p>
        </Link>

        <Link className="border border-white/10 rounded-2xl p-5 bg-white/2 hover:bg-white/4 transition" href="/forum/news/players">
          <div className="text-sm font-semibold">Announcements (Players)</div>
          <p className="text-sm opacity-70 mt-1">Players-only internal notices.</p>
        </Link>

        <Link className="border border-white/10 rounded-2xl p-5 bg-white/2 hover:bg-white/4 transition" href="/forum/news/devlog">
          <div className="text-sm font-semibold">Developer Changelog</div>
          <p className="text-sm opacity-70 mt-1">Platform patch notes.</p>
        </Link>
      </div>
    </div>
  );
}
