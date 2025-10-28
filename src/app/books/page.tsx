import Link from "next/link";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function fetchBooks() {
  const h = await headers();
  const origin =
    h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const res = await fetch(`${origin}/api/books`, { cache: "no-store" });
  return res.ok ? res.json() : [];
}

export default async function BooksPage() {
  const books = await fetchBooks();

  async function create(formData: FormData) {
    "use server";
    const title = String(formData.get("title") || "");
    const tagline = String(formData.get("tagline") || "");

    const cookie = (await cookies()).toString();
    const h = await headers();
    const origin =
      h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

    const res = await fetch(`${origin}/api/books`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ title, tagline }),
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to create book (${res.status}): ${txt}`);
    }

    const data = await res.json(); // { slug }
    redirect(`/books/${data.slug}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Books</h1>

      <ul className="grid gap-3">
        {books.length === 0 && <p className="opacity-60">No books yet.</p>}
        {books.map((b: any) => (
          <li key={b.slug} className="border border-neutral-800 rounded-xl p-4">
            <Link className="text-lg font-medium hover:underline" href={`/books/${b.slug}`}>
              {b.title}
            </Link>
            <p className="opacity-60 text-xs mt-1">{b.status.toLowerCase()}</p>
          </li>
        ))}
      </ul>

      <form action={create} className="border border-neutral-800 rounded-xl p-4 space-y-2">
        <h2 className="text-lg font-medium">Create a book</h2>
        <input
          name="title"
          placeholder="Title"
          className="w-full rounded bg-transparent border border-neutral-700 px-3 py-2"
          required
        />
        <input
          name="tagline"
          placeholder="Tagline (optional)"
          className="w-full rounded bg-transparent border border-neutral-700 px-3 py-2"
        />
        <button className="rounded bg-white text-black px-4 py-2">Create</button>
        <p className="opacity-60 text-xs">Requires sign-in.</p>
      </form>
    </div>
  );
}
