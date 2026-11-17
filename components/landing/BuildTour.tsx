import { Check } from "lucide-react";

// An illustration of Build mode, using one worked example. The three steps match how Build runs:
// the request is turned into a problem statement, the equations are solved by the platform's
// solver, and then the text around them is written.

const HEX = "[clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]";

const PROMPT =
  "Size a timber beam. It is 200 mm wide and simply supported over 6 m. It carries 12 kN/m along the whole span and a 20 kN point load 2 m from the left support. Keep bending stress under 12 MPa and shear stress under 1 MPa. Pick the depth in 25 mm steps.";

const PROBLEM_STATEMENT =
  "Design the depth of a rectangular timber beam, 200 mm wide, simply supported over a 6 m span. Loads: 12 kN/m over the full span and a 20 kN point load 2 m from the left support. Allowable stresses: 12 MPa in bending and 1 MPa in shear. Find the support reactions, the maximum bending moment and the smallest depth that satisfies bending, round it up to a 25 mm step, and check bending and shear for that depth.";

type Row = { label: string; expr: React.ReactNode; result: string; check?: boolean };

const rows: Row[] = [
  {
    label: "Reaction at B",
    expr: <>R<sub>B</sub> = (w·L·L/2 + P·a) / L</>,
    result: "42.67 kN",
  },
  {
    label: "Reaction at A",
    expr: <>R<sub>A</sub> = w·L + P − R<sub>B</sub></>,
    result: "49.33 kN",
  },
  {
    label: "Where the shear is zero",
    expr: <>x = a + (R<sub>A</sub> − w·a − P) / w</>,
    result: "2.444 m",
  },
  {
    label: "Maximum moment",
    expr: <>M<sub>max</sub> = R<sub>A</sub>·x − w·x²/2 − P·(x − a)</>,
    result: "75.85 kN·m",
  },
  {
    label: "Section modulus needed",
    expr: <>S<sub>req</sub> = M<sub>max</sub> / σ<sub>allow</sub></>,
    result: "6.32 × 10⁶ mm³",
  },
  {
    label: "Smallest depth",
    expr: <>h<sub>min</sub> = √(6·S<sub>req</sub> / b)</>,
    result: "435.5 mm",
  },
  {
    label: "Depth chosen, next 25 mm step",
    expr: <>h = h<sub>min</sub> rounded up to 25 mm</>,
    result: "450 mm",
  },
  {
    label: "Bending check",
    expr: <>σ = M<sub>max</sub> / (b·h²/6) ≤ σ<sub>allow</sub></>,
    result: "11.24 MPa",
    check: true,
  },
  {
    label: "Shear check",
    expr: <>τ = 1.5·R<sub>A</sub> / (b·h) ≤ τ<sub>allow</sub></>,
    result: "0.822 MPa",
    check: true,
  },
];

const steps = [
  {
    title: "Understand the task",
    text: "It reads your prompt together with the document and states the problem: what is given and what has to be found. You see this in the chat, so you know how it read the request.",
  },
  {
    title: "Solve with the solver",
    text: "It writes only the equations. The platform's unit-aware solver calculates every one of them. If an equation has an error, the error is sent back so the model can correct it. The numbers come from the solver, not from the model.",
  },
  {
    title: "Write the document",
    text: "With the solved equations in hand, it writes the headers, text and symbolic formulas around them. Each solved equation is placed once, with the value the solver found.",
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

export default function BuildTour() {
  return (
    <section id="build-tour" className="py-24 bg-white">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="mb-12">
          <h2 className="flex items-center gap-3 font-mono text-base font-semibold uppercase tracking-wider text-blue-600 before:h-[14px] before:w-[13px] before:shrink-0 before:bg-current before:content-[''] before:[clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)] after:h-px after:flex-1 after:bg-gradient-to-r after:from-gray-300 after:to-transparent after:content-['']">
            Build mode, step by step
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-gray-700">
            Describe a problem in plain words. Build mode works it out in three steps and adds the result to your
            document as ordinary blocks you can read and edit. Here is one example.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 mb-10">
          <Label>You write</Label>
          <p className="text-gray-800 leading-relaxed">{PROMPT}</p>
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
                    <Label>What it understood</Label>
                    <p className="text-sm leading-relaxed text-gray-700">{PROBLEM_STATEMENT}</p>
                  </>
                )}

                {i === 1 && (
                  <>
                    <Label>Equations, solved</Label>
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

                {i === 2 && (
                  <>
                    <Label>Added to the document</Label>
                    <div className="space-y-3">
                      <h4 className="font-serif text-xl font-bold text-gray-900">Bending</h4>
                      <p className="font-serif text-[15px] leading-relaxed text-gray-800">
                        The beam is governed by bending, and the bending moment is largest where the shear force
                        passes through zero. That happens 2.44 m from the left support, where the moment reaches
                        75.85 kN·m. Dividing by the allowable stress gives the section modulus the beam needs, and
                        from it the smallest depth for a 200 mm width.
                      </p>
                      <p className="py-1 text-center font-serif text-lg italic text-gray-900">σ = M / S</p>
                      <p className="font-serif text-[15px] leading-relaxed text-gray-800">
                        A 450 mm depth passes both checks: 11.24 MPa in bending against 12 MPa allowed, and
                        0.82 MPa in shear against 1 MPa.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-sm text-gray-500">
          Build mode adds equations, text, headers and symbolic formulas. Plots, images, sliders and loops come from the
          Add menu.
        </p>
      </div>
    </section>
  );
}
