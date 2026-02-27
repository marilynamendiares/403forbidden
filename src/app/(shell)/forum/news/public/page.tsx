import BackButton from "@/components/BackButton";
export const dynamic = "force-dynamic";

export default function NewsPublic() {
  return (
    <div className="space-y-6">
      <div>
        <BackButton fallbackHref="/forum/news" />
        <h1 className="text-2xl font-semibold mt-2">Announcements (Public)</h1>
        <p className="text-sm opacity-70 mt-1">Read-only channel.</p>
      </div>

      <div className="border border-white/10 rounded-2xl p-5 bg-white/2 opacity-80">
        <div className="text-sm font-mono uppercase tracking-[0.22em] opacity-60">TODO</div>
        <p className="text-sm opacity-70 mt-2">
          Replace this with real announcement feed (latest first).
        </p>
      </div>
    </div>
  );
}
