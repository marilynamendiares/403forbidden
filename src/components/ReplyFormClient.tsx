// src/components/ReplyFormClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="rounded bg-white text-black px-4 py-2 disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Sending..." : "Send"}
    </button>
  );
}

export default function ReplyFormClient({
  action,
}: {
  // серверный экшен из RSC
  action: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const { pending } = useFormStatus();

  // Сбрасываем форму, когда отправка завершилась
  useEffect(() => {
    if (justSubmitted && !pending) {
      formRef.current?.reset();
      setJustSubmitted(false);
    }
  }, [pending, justSubmitted]);

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={() => setJustSubmitted(true)}
      className="border border-neutral-800 rounded-xl p-4 space-y-2"
    >
      <h2 className="text-lg font-medium">Reply</h2>
      <textarea
        name="content"
        placeholder="Your reply (markdown)"
        className="w-full rounded bg-transparent border border-neutral-700 px-3 py-2"
        rows={5}
        required
      />
      <SubmitButton />
      <p className="opacity-60 text-xs">Requires sign-in.</p>
    </form>
  );
}
