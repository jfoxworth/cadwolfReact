"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PricingCards() {
  const router = useRouter();
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [seats, setSeats] = useState(5);
  const [loading, setLoading] = useState<string | null>(null);

  const proPrice = interval === "monthly" ? 10 : 100;
  const bizPrice = interval === "monthly" ? seats * 15 : seats * 150;
  const bizUnit = interval === "monthly" ? "$15/seat/mo" : "$150/seat/yr";

  async function subscribe(plan: "pro" | "business") {
    setLoading(plan);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, interval, seats: plan === "business" ? seats : 1 }),
    });
    if (res.status === 401) {
      router.push("/login?from=/accounts");
      return;
    }
    const data = await res.json() as { url?: string; error?: string };
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error ?? "Something went wrong");
      setLoading(null);
    }
  }

  return (
    <div className="mt-8">
      {/* Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-3 bg-gray-100 border border-gray-200 rounded-full px-4 py-2">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${interval === "monthly" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${interval === "yearly" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-800"}`}
          >
            Yearly <span className="text-green-600 font-semibold ml-1">Save 17%</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Free */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col">
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Free</p>
            <p className="text-4xl font-bold text-gray-900">$0</p>
            <p className="text-gray-400 text-sm mt-1">forever</p>
          </div>
          <ul className="space-y-3 text-sm text-gray-600 flex-1 mb-8">
            <li className="flex items-center gap-2"><Check />500 MB storage</li>
            <li className="flex items-center gap-2"><Check />Unlimited documents</li>
            <li className="flex items-center gap-2"><Check />All solvers</li>
            <li className="flex items-center gap-2 text-gray-400"><X />Image uploads</li>
            <li className="flex items-center gap-2 text-gray-400"><X />Team features</li>
          </ul>
          <a
            href="/register"
            className="block text-center py-2.5 px-4 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Get started free
          </a>
        </div>

        {/* Pro */}
        <div className="bg-blue-600 rounded-2xl p-8 flex flex-col text-white relative">
          <div className="absolute top-4 right-4 bg-blue-500 text-xs font-semibold px-2.5 py-1 rounded-full">
            Most popular
          </div>
          <div className="mb-6">
            <p className="text-sm font-semibold text-blue-200 uppercase tracking-wide mb-1">Pro</p>
            <p className="text-4xl font-bold">${proPrice}</p>
            <p className="text-blue-200 text-sm mt-1">{interval === "monthly" ? "per month" : "per year"}</p>
          </div>
          <ul className="space-y-3 text-sm flex-1 mb-8">
            <li className="flex items-center gap-2"><Check white />10 GB storage</li>
            <li className="flex items-center gap-2"><Check white />Unlimited documents</li>
            <li className="flex items-center gap-2"><Check white />All solvers</li>
            <li className="flex items-center gap-2"><Check white />Image uploads</li>
            <li className="flex items-center gap-2 text-blue-300"><X white />Team features</li>
          </ul>
          <button
            onClick={() => subscribe("pro")}
            disabled={loading === "pro"}
            className="py-2.5 px-4 rounded-lg bg-white text-blue-600 text-sm font-semibold hover:bg-blue-50 transition disabled:opacity-60"
          >
            {loading === "pro" ? "Redirecting…" : "Subscribe"}
          </button>
        </div>

        {/* Business */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col">
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Business</p>
            <p className="text-4xl font-bold text-gray-900">${bizPrice}</p>
            <p className="text-gray-400 text-sm mt-1">{bizUnit} · {seats} seats</p>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">Number of seats</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSeats(s => Math.max(1, s - 1))}
                className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold"
              >−</button>
              <span className="text-lg font-semibold w-8 text-center">{seats}</span>
              <button
                onClick={() => setSeats(s => s + 1)}
                className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold"
              >+</button>
            </div>
          </div>
          <ul className="space-y-3 text-sm text-gray-600 flex-1 mb-8">
            <li className="flex items-center gap-2"><Check />50 GB storage per seat</li>
            <li className="flex items-center gap-2"><Check />Unlimited documents</li>
            <li className="flex items-center gap-2"><Check />All solvers</li>
            <li className="flex items-center gap-2"><Check />Image uploads</li>
            <li className="flex items-center gap-2"><Check />Team management</li>
            <li className="flex items-center gap-2"><Check />Seat management</li>
          </ul>
          <button
            onClick={() => subscribe("business")}
            disabled={loading === "business"}
            className="py-2.5 px-4 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-60"
          >
            {loading === "business" ? "Redirecting…" : "Subscribe"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Check({ white }: { white?: boolean }) {
  return (
    <svg className={`w-4 h-4 flex-shrink-0 ${white ? "text-blue-200" : "text-green-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function X({ white }: { white?: boolean }) {
  return (
    <svg className={`w-4 h-4 flex-shrink-0 ${white ? "text-blue-300" : "text-gray-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
