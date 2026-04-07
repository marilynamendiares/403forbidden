"use client";

export function ReplyFormSection({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="space-y-2 rounded-xl border border-neutral-800 p-4">{children}</div>;
}

export function ReplyTextArea() {
  return (
    <textarea
      name="content"
      placeholder="Your reply (markdown)"
      className="w-full rounded border border-neutral-700 bg-transparent px-3 py-2"
      rows={5}
      required
    />
  );
}
