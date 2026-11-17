import { Check } from "lucide-react";

// An illustration of part tree Build mode, using one made-up example. The steps follow
// PART_TREE_BUILD_PROCESS.md: the main coordinator reads the requirements and decides the structure,
// design documents record how it read them, each system gets a coordinator, and each part gets an agent.

const HEX = "[clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]";

const PROMPT = "Read the requirements documents and build the system in question.";

const requirementsDocument = {
  text: "The footbridge is a steel truss bridge spanning 12 m. Two identical trusses, each made of a top chord, a bottom chord and diagonal members, carry a timber deck between them.",
  flagged: [
    "Minimum factor of safety of 2.0",
    "Live load on the deck of 4 kPa",
    "Total mass under 2500 kg",
  ],
};

type TreeItem = { name: string; kind: "root" | "system" | "part"; count?: number; depth: number };

const topTree: TreeItem[] = [
  { name: "Footbridge", kind: "root", depth: 0 },
  { name: "Truss", kind: "system", count: 2, depth: 1 },
  { name: "Deck", kind: "system", depth: 1 },
];

const trussTree: TreeItem[] = [
  { name: "Truss", kind: "system", depth: 0 },
  { name: "Top chord", kind: "part", depth: 1 },
  { name: "Bottom chord", kind: "part", depth: 1 },
  { name: "Diagonal member", kind: "part", count: 8, depth: 1 },
];

const routing = [
  { text: "Factor of safety of at least 2.0", scope: "Passed to everything beneath" },
  { text: "Live load on the deck of 4 kPa", scope: "Deck only, not passed to the Truss" },
  { text: "Total mass under 2500 kg", scope: "Passed to everything beneath" },
];

type Row = { label: string; expr: React.ReactNode; result: string; check?: boolean };

const rows: Row[] = [
  {
    label: "Given, from the Truss design document",
    expr: <>T = chord force</>,
    result: "180 kN",
  },
  {
    label: "Allowable stress, with the required factor of safety",
    expr: <>σ<sub>allow</sub> = σ<sub>y</sub> / FS</>,
    result: "125 MPa",
  },
  {
    label: "Area needed",
    expr: <>A<sub>req</sub> = T / σ<sub>allow</sub></>,
    result: "1440 mm²",
  },
  {
    label: "Chosen section",
    expr: <>A = 1600 mm²</>,
    result: "1600 mm²",
  },
  {
    label: "Stress check",
    expr: <>σ = T / A ≤ σ<sub>allow</sub></>,
    result: "112.5 MPa",
    check: true,
  },
  {
    label: "Factor of safety check",
    expr: <>FS<sub>actual</sub> = σ<sub>y</sub> / σ ≥ 2.0</>,
    result: "2.22",
    check: true,
  },
];

const steps = [
  {
    title: "Read and decide the structure",
    text: "The main coordinator reads your requirements documents in full, including the requirements you flagged. It decides which systems and parts sit directly beneath the top. Anything already in your tree is kept and filled in around, not replaced.",
  },
  {
    title: "Record how it read them",
    text: "Every system and part gets a design document: where it sits, which requirements reach it, what it needs from its neighbours, the values the documents state, and the design intent. A requirement that doesn't apply to a part isn't passed to it. You can read these to see how your requirements were interpreted, and stop here before any part is built.",
  },
  {
    title: "Each system repeats the process",
    text: "Every system gets its own coordinator. It reads the design document one level above it and its own requirements documents, then decides the structure beneath it and writes its own design document. This continues down the tree.",
  },
  {
    title: "Each part gets its own agent",
    text: "A part agent reads the part's design document and works out the design as equations. The platform's solver calculates them and sends back errors and failed checks to be fixed. It then writes the part's document, placing each solved equation by number, so the text cannot change a result.",
  },
];

function StepNumber({ n }: { n: number }) {
  return (
    <span className={`flex h-12 w-11 shrink-0 items-center justify-center bg-blue-600 text-lg font-bold text-white ${HEX}`}>
      {n}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-blue-600">{children}</div>
  );
}

function Tree({ items }: { items: TreeItem[] }) {
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={`${t.depth}-${t.name}`} className="flex items-center gap-2" style={{ paddingLeft: t.depth * 28 }}>
          {t.depth > 0 && <span className="h-px w-4 bg-gray-300" aria-hidden="true" />}
          <span
            className={`h-3.5 w-3 shrink-0 ${HEX} ${t.kind === "part" ? "bg-gray-400" : "bg-blue-600"}`}
            aria-hidden="true"
          />
          <span className="font-medium text-gray-900">{t.name}</span>
          {t.count && <span className="font-mono text-xs text-gray-500">× {t.count}</span>}
          <span className="font-mono text-xs uppercase tracking-wider text-gray-400">{t.kind}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PartTreeBuildTour() {
  return (
    <section id="part-tree-build-tour" className="py-24 bg-white">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="mb-12">
          <h2 className="flex items-center gap-3 font-mono text-base font-semibold uppercase tracking-wider text-blue-600 before:h-[14px] before:w-[13px] before:shrink-0 before:bg-current before:content-[''] before:[clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)] after:h-px after:flex-1 after:bg-gradient-to-r after:from-gray-300 after:to-transparent after:content-['']">
            Part tree build, step by step
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-gray-700">
            In a part tree, Build mode starts from your requirements documents. It lays out the systems and parts, writes
            down how it read your requirements, and then builds a calculation document for each part. Here is one
            example.
          </p>
        </div>

        <div className="grid gap-6 mb-10 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <Label>Your requirements document</Label>
            <p className="text-gray-800 leading-relaxed mb-4">{requirementsDocument.text}</p>
            <ul className="space-y-2">
              {requirementsDocument.flagged.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-0.5 shrink-0 rounded border border-blue-200 bg-blue-50 px-1.5 font-mono text-[11px] uppercase tracking-wider text-blue-600">
                    Requirement
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <Label>You write</Label>
            <p className="text-gray-800 leading-relaxed">{PROMPT}</p>
          </div>
        </div>

        <div className="space-y-6">
          {steps.map((s, i) => (
            <div key={s.title} className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="flex gap-4">
                <StepNumber n={i + 1} />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.text}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-6">
                {i === 0 && (
                  <>
                    <Label>Structure it decided</Label>
                    <Tree items={topTree} />
                  </>
                )}

                {i === 1 && (
                  <>
                    <Label>Design document for the Truss: where each requirement goes</Label>
                    <ul className="divide-y divide-gray-100">
                      {routing.map((r) => (
                        <li
                          key={r.text}
                          className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5 first:pt-0 last:pb-0"
                        >
                          <span className="text-sm text-gray-900">{r.text}</span>
                          <span className="font-mono text-xs text-blue-600">{r.scope}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {i === 2 && (
                  <>
                    <Label>Structure beneath the Truss</Label>
                    <Tree items={trussTree} />
                    <p className="mt-4 text-sm text-gray-500">The Deck gets its own coordinator in the same way.</p>
                  </>
                )}

                {i === 3 && (
                  <>
                    <Label>Bottom chord document: equations, solved</Label>
                    <ul className="divide-y divide-gray-100">
                      {rows.map((r) => (
                        <li key={r.label} className="py-2.5 first:pt-0 last:pb-0">
                          <div className="text-xs text-gray-400 mb-0.5">{r.label}</div>
                          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                            <span className="font-serif text-[15px] text-gray-900">{r.expr}</span>
                            <span className="flex items-center gap-1.5 font-mono text-sm font-semibold text-blue-600">
                              {r.result}
                              {r.check && <Check className="h-4 w-4 text-green-600" aria-label="passes" />}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-sm text-gray-500">
          The tree and the design documents are written first. You can stop there and read them before any part document
          is built.
        </p>
      </div>
    </section>
  );
}
