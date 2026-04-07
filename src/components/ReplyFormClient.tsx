// src/components/ReplyFormClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ReplyFormSection, ReplyTextArea } from "@/components/ReplyFormUi";

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

function ResetOnIdle({
  justSubmitted,
  onReset,
}: {
  justSubmitted: boolean;
  onReset: () => void;
}) {
  const { pending } = useFormStatus();

  useEffect(() => {
    if (justSubmitted && !pending) {
      onReset();
    }
  }, [justSubmitted, onReset, pending]);

  return null;
}

export default function ReplyFormClient({
  action,
  onSubmitted,
}: {
  // серверный экшен из RSC
  action: (formData: FormData) => Promise<void>;
  onSubmitted?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={() => setJustSubmitted(true)}
      className="space-y-2"
    >
      <ResetOnIdle
        justSubmitted={justSubmitted}
        onReset={() => {
          formRef.current?.reset();
          setJustSubmitted(false);
          onSubmitted?.();
        }}
      />
      <ReplyFormSection>
        <h2 className="text-lg font-medium">Reply</h2>
        <ReplyTextArea />
        <SubmitButton />
        <p className="text-xs opacity-60">Requires sign-in.</p>
      </ReplyFormSection>
    </form>
  );
}
