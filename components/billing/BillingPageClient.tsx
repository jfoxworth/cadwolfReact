"use client";

import { useState } from "react";
import Link from "next/link";

interface UserData {
  id: number;
  name: string;
  email: string;
  tier: string;
  storageUsed: number;
  storageQuota: number;
  stripeSubscriptionId: string | null;
}

interface TeamData {
  id: number;
  name: string;
  tier: string;
  seatCount: number;
  storageUsed: number;
  storageQuota: number;
  stripeSubscriptionId: string | null;
}

interface CreditsData {
  balance: number;
  packs: { id: string; dollars: number }[];
  purchases: { id: number; credits: number; source: string; description: string | null; createdAt: string }[];
  usage: { id: number; credits: number; pageType: string; source: string; model: string; createdAt: string; who?: string }[];
}

interface TeamCreditsData {
  teamId: number;
  name: string;
  canManage: boolean;
  balance: number;
  packs?: { id: string; dollars: number }[];
  members: { userId: number; name: string; monthCredits: number; limitCredits: number | null }[];
  purchases: CreditsData["purchases"];
  usage: CreditsData["usage"];
}

function formatCredits(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function CreditsCard({ credits, teamId, title = "AI credits", canBuy = true }: { credits: CreditsData; teamId?: number; title?: string; canBuy?: boolean }) {
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function buy(packId: string) {
    setBuying(packId);
    setError("");
    try {
      const res = await fetch("/api/stripe/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, teamId }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data.error ?? "Could not start checkout");
    } catch {
      setError("Could not start checkout");
    }
    setBuying(null);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-baseline justify-between">
        <p className="font-semibold text-gray-900">{title}</p>
        <p className={`text-2xl font-bold ${credits.balance <= 0 ? "text-red-600" : "text-gray-900"}`}>
          {formatCredits(credits.balance)}
        </p>
      </div>
      <p className="text-xs text-gray-500">1,000 credits is $1 of AI use. Each request uses credits according to the model and the size of the work.</p>

      {canBuy && <div className="flex flex-wrap gap-2">
        {credits.packs.map((p) => (
          <button
            key={p.id}
            onClick={() => buy(p.id)}
            disabled={buying !== null}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {buying === p.id ? "Opening…" : `Buy ${formatCredits(p.dollars * 1000)} credits · $${p.dollars}`}
          </button>
        ))}
      </div>}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {credits.purchases.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Purchases</p>
          <table className="w-full text-xs text-gray-700">
            <tbody>
              {credits.purchases.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="py-1 pr-2">{formatWhen(p.createdAt)}</td>
                  <td className="py-1 pr-2">{p.description ?? p.source}</td>
                  <td className="py-1 text-right">+{formatCredits(p.credits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {credits.usage.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Recent use</p>
          <table className="w-full text-xs text-gray-700">
            <tbody>
              {credits.usage.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="py-1 pr-2">{formatWhen(u.createdAt)}</td>
                  <td className="py-1 pr-2">{u.who ? `${u.who} · ` : ""}{u.pageType} · {u.source.replace(/_/g, " ")} · {u.model}</td>
                  <td className="py-1 text-right">-{formatCredits(u.credits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MemberLimits({ team }: { team: TeamCreditsData }) {
  const [limits, setLimits] = useState<Record<number, string>>(
    Object.fromEntries(team.members.map((m) => [m.userId, m.limitCredits === null ? "" : String(m.limitCredits)])),
  );
  const [msg, setMsg] = useState("");

  async function save(userId: number) {
    const raw = (limits[userId] ?? "").trim();
    const res = await fetch("/api/ai-credits/limits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: team.teamId, userId, monthlyCredits: raw === "" ? null : Number(raw) }),
    });
    const data = await res.json() as { error?: string };
    setMsg(res.ok ? "Saved" : (data.error ?? "Could not save"));
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Members: use this month and monthly limit</p>
      <table className="w-full text-xs text-gray-700">
        <tbody>
          {team.members.map((m) => (
            <tr key={m.userId} className="border-t border-gray-100">
              <td className="py-1 pr-2">{m.name}</td>
              <td className="py-1 pr-2 text-right">{formatCredits(m.monthCredits)} used</td>
              <td className="py-1 text-right">
                <input
                  type="number"
                  min={0}
                  placeholder="No limit"
                  value={limits[m.userId] ?? ""}
                  onChange={(e) => setLimits((prev) => ({ ...prev, [m.userId]: e.target.value }))}
                  className="w-24 rounded border border-gray-300 px-2 py-0.5 text-xs"
                />
                <button onClick={() => save(m.userId)} className="ml-1 px-2 py-0.5 text-xs rounded bg-gray-900 text-white hover:bg-gray-800">Save</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {msg && <p className="text-xs text-gray-500 mt-1">{msg}</p>}
    </div>
  );
}

function TeamCreditsCard({ team, packs }: { team: TeamCreditsData; packs: CreditsData["packs"] }) {
  return (
    <div className="space-y-4">
      <CreditsCard
        credits={{ balance: team.balance, packs, purchases: team.purchases, usage: team.usage }}
        teamId={team.teamId}
        title={`${team.name} · shared AI credits`}
        canBuy={team.canManage}
      />
      {team.canManage && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <MemberLimits team={team} />
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function StorageBar({ used, quota }: { used: number; quota: number }) {
  const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-blue-500";
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{formatBytes(used)} used</span>
        <span>{formatBytes(quota)} total</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ManageButton({ customerId, teamId }: { customerId: string | null; teamId?: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openPortal() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(teamId ? { teamId } : {}),
    });
    const data = await res.json() as { url?: string; error?: string };
    if (data.url) {
      window.location.href = data.url;
    } else {
      setError(data.error ?? "Failed to open billing portal");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={openPortal}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-60"
      >
        {loading ? "Opening…" : "Manage Subscription"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function SeatAdjuster({ team }: { team: TeamData }) {
  const [seats, setSeats] = useState(team.seatCount || 1);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function updateSeats() {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/stripe/seats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: team.id, seats }),
    });
    const data = await res.json() as { ok?: boolean; error?: string };
    setMsg(data.ok ? `Updated to ${seats} seats` : (data.error ?? "Failed to update"));
    setSaving(false);
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-sm font-medium text-gray-700 mb-2">Adjust seats</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSeats(s => Math.max(1, s - 1))}
          className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold"
        >−</button>
        <span className="text-base font-semibold w-6 text-center">{seats}</span>
        <button
          onClick={() => setSeats(s => s + 1)}
          className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold"
        >+</button>
        <button
          onClick={updateSeats}
          disabled={saving || seats === team.seatCount}
          className="ml-2 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? "Saving…" : "Update"}
        </button>
      </div>
      {msg && <p className="text-xs text-gray-500 mt-1">{msg}</p>}
    </div>
  );
}

export default function BillingPageClient({
  user,
  ownedTeams,
  showSuccess,
  showCreditsSuccess,
  credits,
  teamCredits,
}: {
  user: UserData;
  ownedTeams: TeamData[];
  successTeamId: number | null;
  showSuccess: boolean;
  showCreditsSuccess: boolean;
  credits: CreditsData;
  teamCredits: TeamCreditsData[];
}) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Billing</h1>

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-800">
          Subscription activated! Your plan has been updated.
        </div>
      )}

      {showCreditsSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-800">
          Payment received. Your credits are added as soon as Stripe confirms it, which is usually a few seconds. Reload if the balance has not changed.
        </div>
      )}

      <CreditsCard credits={credits} />

      {teamCredits.map((t) => (
        <TeamCreditsCard key={t.teamId} team={t} packs={credits.packs} />
      ))}

      {/* Personal plan */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${
            user.tier === "pro" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
          }`}>
            {user.tier}
          </span>
        </div>

        <StorageBar used={user.storageUsed} quota={user.storageQuota} />

        <div className="flex items-center gap-3 pt-1">
          {user.stripeSubscriptionId ? (
            <ManageButton customerId={user.stripeSubscriptionId} />
          ) : (
            <Link
              href="/pricing"
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Upgrade to Pro
            </Link>
          )}
        </div>
      </div>

      {/* Owned teams */}
      {ownedTeams.map(team => (
        <div key={team.id} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{team.name}</p>
              <p className="text-sm text-gray-500">Team · {team.seatCount} seat{team.seatCount !== 1 ? "s" : ""}</p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${
              team.tier === "business" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"
            }`}>
              {team.tier}
            </span>
          </div>

          {team.storageQuota > 0 && (
            <StorageBar used={team.storageUsed} quota={team.storageQuota} />
          )}

          <div className="flex items-center gap-3 pt-1">
            {team.stripeSubscriptionId ? (
              <ManageButton customerId={team.stripeSubscriptionId} teamId={team.id} />
            ) : (
              <Link
                href="/pricing"
                className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
              >
                Upgrade to Business
              </Link>
            )}
          </div>

          {team.tier === "business" && team.stripeSubscriptionId && (
            <SeatAdjuster team={team} />
          )}
        </div>
      ))}
    </div>
  );
}
