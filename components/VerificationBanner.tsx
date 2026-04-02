"use client";

import { useState } from "react";

export default function VerificationBanner({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function resend() {
    setLoading(true);
    await fetch("/api/auth/send-verification", { method: "POST" });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-3 text-sm text-amber-800">
      <span>
        Please verify your email address. We sent a link to <strong>{email}</strong>.
      </span>
      {sent ? (
        <span className="text-green-700 font-medium">Sent!</span>
      ) : (
        <button
          onClick={resend}
          disabled={loading}
          className="underline font-medium hover:text-amber-900 disabled:opacity-50"
        >
          {loading ? "Sending…" : "Resend"}
        </button>
      )}
    </div>
  );
}
