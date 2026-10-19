const prompts = [
  { prompt: "Size a shaft for 50 N·m of torque with a safety factor of 2", tag: "Mechanical" },
  { prompt: "Plot the deflection of a cantilever beam for three load cases", tag: "Structural" },
  { prompt: "Fit a curve to my tensile test dataset and report the yield stress", tag: "Data" },
  { prompt: "Add a slider for wall thickness and show how mass changes", tag: "Design" },
  { prompt: "Simulate a bungee jumper and plot velocity against time", tag: "Dynamics" },
  { prompt: "Check my unit conversions and explain any dimension errors", tag: "Review" },
];

export default function AiPrompts() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">What you can ask it</h2>
          <p className="text-gray-500">
            Every answer becomes editable blocks in a document, not a block of chat text
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts.map(({ prompt, tag }) => (
            <a
              key={prompt}
              href="/register"
              className="group block rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-gray-900 font-medium mb-4">“{prompt}”</p>
              <span className="text-sm text-blue-600 group-hover:underline">{tag} →</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
