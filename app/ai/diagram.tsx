import type { ReactNode } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";

// Building blocks shared by the pages under /ai that explain how the AI works with pictures.

export function Section({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      {intro && <p className="mt-1 max-w-3xl text-sm text-slate-600">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Card({
  title, tone = "slate", children, className = "", action,
}: { title: string; tone?: "slate" | "blue" | "teal" | "amber" | "violet"; children?: ReactNode; className?: string; action?: ReactNode }) {
  const tones = {
    slate: "border-slate-300 bg-white",
    blue: "border-blue-300 bg-blue-50",
    teal: "border-teal-300 bg-teal-50",
    amber: "border-amber-300 bg-amber-50",
    violet: "border-violet-300 bg-violet-50",
  };
  return (
    <div className={`rounded-lg border p-4 ${tones[tone]} ${className}`}>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      {children && <div className="mt-1 text-xs leading-relaxed text-slate-700">{children}</div>}
      {action}
    </div>
  );
}

export function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1 px-1 py-1 text-slate-400">
      <ArrowRight className="hidden h-5 w-5 md:block" />
      <ArrowDown className="h-5 w-5 md:hidden" />
      {label && <span className="max-w-[7rem] text-center text-[10px] leading-tight">{label}</span>}
    </div>
  );
}

export function Pill({ children, tone }: { children: ReactNode; tone: "teal" | "blue" | "amber" | "slate" }) {
  const tones = {
    teal: "border-teal-300 bg-teal-100 text-teal-900",
    blue: "border-blue-300 bg-blue-100 text-blue-900",
    amber: "border-amber-300 bg-amber-100 text-amber-900",
    slate: "border-slate-300 bg-slate-100 text-slate-800",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${tones[tone]}`}>{children}</span>;
}
