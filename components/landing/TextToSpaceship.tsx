const steps = [
  { title: "Requirements", text: "Plain-language goals and constraints, captured as requirements in the part tree." },
  { title: "AI builds", text: "The assistant drafts the calculations, documents and plots that answer them." },
  { title: "Solver verifies", text: "A deterministic, unit-aware solver checks every number against the requirements." },
  { title: "CAD link", text: "Verified parameters flow into Onshape and Fusion models, and changes flow back." },
];

export default function TextToSpaceship() {
  return (
    <section id="text-to-spaceship" className="py-24 bg-gray-100">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Toward Text-to-Spaceship</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            NASA Goddard has described a vision called Text-to-Spaceship: plain-language
            requirements flowing through AI-accessible design, analysis, and manufacturing tools to
            cut mission development time. ENGENTIC is building the engineering platform for that
            workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-xl bg-white border border-gray-200 p-6 text-center">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
                {i + 1}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-400">
            ENGENTIC is an independent project and is not affiliated with or endorsed by NASA.
          </p>
        </div>
      </div>
    </section>
  );
}
