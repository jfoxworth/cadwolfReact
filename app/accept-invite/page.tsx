"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface InviteInfo {
  teamName: string;
  role: string;
  expired: boolean;
  accepted: boolean;
  email: string;
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [acting, setActing] = useState<"accept" | "decline" | null>(null);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!token) { setLoadError("Invalid invite link."); return; }
    fetch(`/api/invites/${token}`)
      .then(async (res) => {
        if (res.ok) {
          setInvite(await res.json() as InviteInfo);
        } else {
          const d = await res.json().catch(() => ({})) as { error?: string };
          setLoadError(d.error ?? "Invite not found.");
        }
      })
      .catch(() => setLoadError("Failed to load invite."));
  }, [token]);

  async function handleAccept() {
    setActing("accept");
    setActionError("");
    const res = await fetch(`/api/invites/${token}/accept`, { method: "POST" });
    if (res.ok) {
      setDone("accepted");
      setTimeout(() => router.push("/teams"), 1500);
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string };
      // If 401 (not logged in), redirect to login
      if (res.status === 401) {
        router.push(`/login?from=${encodeURIComponent(`/accept-invite?token=${token}`)}`);
        return;
      }
      setActionError(d.error ?? "Failed to accept invite.");
    }
    setActing(null);
  }

  async function handleDecline() {
    setActing("decline");
    setActionError("");
    const res = await fetch(`/api/invites/${token}/decline`, { method: "POST" });
    if (res.ok) {
      setDone("declined");
      setTimeout(() => router.push("/"), 1500);
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string };
      if (res.status === 401) {
        router.push(`/login?from=${encodeURIComponent(`/accept-invite?token=${token}`)}`);
        return;
      }
      setActionError(d.error ?? "Failed to decline.");
    }
    setActing(null);
  }

  if (loadError) {
    return (
      <div className="text-center">
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3 mb-4">{loadError}</p>
        <Link href="/" className="text-blue-600 hover:underline text-sm">Go home</Link>
      </div>
    );
  }

  if (!invite) {
    return <p className="text-sm text-gray-400 text-center">Loading invite…</p>;
  }

  if (invite.expired) {
    return (
      <div className="text-center">
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3 mb-4">
          This invite link has expired. Ask a team admin to send a new one.
        </p>
        <Link href="/" className="text-blue-600 hover:underline text-sm">Go home</Link>
      </div>
    );
  }

  if (invite.accepted) {
    return (
      <div className="text-center">
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-4 py-3 mb-4">
          This invite has already been accepted.
        </p>
        <Link href="/teams" className="text-blue-600 hover:underline text-sm">Go to Teams</Link>
      </div>
    );
  }

  if (done === "accepted") {
    return (
      <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-4 py-3 text-center">
        You've joined <strong>{invite.teamName}</strong>! Redirecting…
      </p>
    );
  }

  if (done === "declined") {
    return (
      <p className="text-sm text-gray-600 text-center">Invite declined. Redirecting…</p>
    );
  }

  return (
    <div className="text-center space-y-4">
      <p className="text-gray-700 text-sm">
        You've been invited to join <strong className="text-gray-900">{invite.teamName}</strong> as a{" "}
        <strong className="text-gray-900">{invite.role}</strong>.
      </p>
      <p className="text-xs text-gray-400">Sent to {invite.email}</p>
      {actionError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{actionError}</p>
      )}
      <div className="flex gap-3 justify-center pt-2">
        <button
          onClick={handleAccept}
          disabled={!!acting}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {acting === "accept" ? "Joining…" : "Accept"}
        </button>
        <button
          onClick={handleDecline}
          disabled={!!acting}
          className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 transition"
        >
          {acting === "decline" ? "Declining…" : "Decline"}
        </button>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-md w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Team Invitation</h1>
        </div>
        <Suspense fallback={<p className="text-sm text-gray-400 text-center">Loading…</p>}>
          <AcceptInviteContent />
        </Suspense>
      </div>
    </div>
  );
}
