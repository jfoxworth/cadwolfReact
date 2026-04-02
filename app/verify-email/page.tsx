"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Invalid verification link.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
        } else {
          const data = await res.json().catch(() => ({})) as { error?: string };
          setStatus("error");
          setError(data.error ?? "Verification failed. Please try again.");
        }
      })
      .catch(() => {
        setStatus("error");
        setError("Something went wrong. Please try again.");
      });
  }, [token]);

  if (status === "loading") {
    return <p className="text-sm text-gray-500 text-center">Verifying your email…</p>;
  }

  if (status === "success") {
    return (
      <div className="text-center">
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-4 py-3 mb-6">
          Your email has been verified. You&apos;re all set!
        </p>
        <Link href="/login" className="text-blue-600 hover:underline text-sm font-medium">
          Continue to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3 mb-6">
        {error}
      </p>
      <Link href="/forgot-password" className="text-blue-600 hover:underline text-sm font-medium">
        Request a new link
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-md w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Email verification</h1>
        </div>
        <Suspense fallback={<p className="text-sm text-gray-400 text-center">Loading…</p>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
