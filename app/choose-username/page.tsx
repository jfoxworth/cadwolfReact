"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type CheckState = "idle" | "checking" | "available" | "taken" | "invalid";

function useUsernameCheck(username: string) {
  const [state, setState] = useState<CheckState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!username) { setState("idle"); return; }

    setState("checking");
    timerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/auth/username-check?username=${encodeURIComponent(username)}`);
      const data = await res.json() as { available: boolean; error?: string };
      if (data.available) {
        setState("available");
        setErrorMsg("");
      } else {
        setState(data.error ? "invalid" : "taken");
        setErrorMsg(data.error ?? "Username already taken");
      }
    }, 350);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [username]);

  return { state, errorMsg };
}

export default function ChooseUsernamePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { state, errorMsg } = useUsernameCheck(username);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state !== "available") return;
    setSubmitting(true);
    setSubmitError("");

    const res = await fetch("/api/auth/claim-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    if (res.ok) {
      router.push(`/workspace/${username}`);
    } else {
      const data = await res.json() as { error?: string };
      setSubmitError(data.error ?? "Failed to save username");
      setSubmitting(false);
    }
  }

  const statusColor =
    state === "available" ? "text-green-600" :
    state === "taken" || state === "invalid" ? "text-red-600" :
    "text-gray-400";

  const statusText =
    state === "available" ? "Available!" :
    state === "checking" ? "Checking…" :
    state === "taken" ? "Already taken" :
    state === "invalid" ? errorMsg :
    "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-md w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Choose a username</h1>
          <p className="text-sm text-gray-500 mt-2">
            Your username is your workspace address on CadWolf.
            <br />
            <span className="font-medium text-gray-700">cadwolf.com/workspace/</span>
            <span className="font-medium text-blue-600">{username || "yourname"}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              required
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.trim())}
              placeholder="e.g. jane_doe"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {statusText && (
              <p className={`text-xs mt-1 ${statusColor}`}>{statusText}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Letters, numbers, underscores, and hyphens only. 3–30 characters.
            </p>
          </div>

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={state !== "available" || submitting}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {submitting ? "Saving…" : "Claim username"}
          </button>
        </form>
      </div>
    </div>
  );
}
