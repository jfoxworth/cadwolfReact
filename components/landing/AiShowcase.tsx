const steps = [
  {
    n: "1",
    title: "Describe",
    text: "Tell the assistant the problem in plain language, or point it at an existing document.",
  },
  {
    n: "2",
    title: "AI builds",
    text: "It writes the equations, sliders, datasets and plots as ordinary blocks you can read and edit.",
  },
  {
    n: "3",
    title: "Solver verifies",
    text: "A deterministic, unit-aware solver does the arithmetic, so every number is checkable.",
  },
];

export default function AiShowcase() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Ask. Solve. Verify.</h2>
          <p className="text-gray-500">
            The ENGENTIC assistant builds engineering calculations for you, and the solver proves them
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-14">
          {steps.map((s) => (
            <div key={s.n} className="rounded-xl border border-gray-200 p-6 text-center">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
                {s.n}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>

        {/* TODO: replace this mock with looping screen recordings of the assistant */}
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Assistant</p>
            <div className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 text-white text-sm px-4 py-2">
              Size a solid steel shaft for 50 N·m of torque with a safety factor of 2.
            </div>
            <div className="self-start max-w-[85%] rounded-2xl rounded-bl-sm bg-white border border-gray-200 text-gray-700 text-sm px-4 py-2">
              I added the inputs, the shear stress equation and a diameter result to your document.
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 font-mono text-sm text-gray-700 flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 font-sans">Document</p>
            <div>T = 50 N·m</div>
            <div>τ_allow = 250 MPa / 2 = <span className="text-blue-700 font-semibold">125 MPa</span></div>
            <div>d = (16·T / (π·τ_allow))^(1/3) = <span className="text-blue-700 font-semibold">12.7 mm</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
