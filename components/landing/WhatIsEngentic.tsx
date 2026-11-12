import { FileText, FolderOpen, Network, Table2 } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Documents",
    text: "Text, equations and plots in one page that solves as you write.",
  },
  {
    icon: FolderOpen,
    title: "Workspaces",
    text: "Folders that hold and organize your documents, datasets and part trees.",
  },
  {
    icon: Network,
    title: "Part Trees",
    text: "A system broken down into subsystems and parts, with a document for each.",
  },
  {
    icon: Table2,
    title: "Datasets",
    text: "Tables of data that your documents can read and calculate from.",
  },
];

export default function EngenticAI() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="mb-12">
          <h2 className="flex items-center gap-3 font-mono text-base font-semibold uppercase tracking-wider text-blue-600 before:h-[14px] before:w-[13px] before:shrink-0 before:bg-current before:content-[''] before:[clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)] after:h-px after:flex-1 after:bg-gradient-to-r after:from-gray-300 after:to-transparent after:content-['']">
            What is Engentic.tech?
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-gray-700">
            Engentic is a simultaneous analysis and documentation platform. Its documents contain both text, headers, and normal document components as well as equations, plots, and everything needed to solve and document a problem.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mb-14">
          {steps.map((s) => (
            <div key={s.title} className="rounded-xl border border-gray-200 p-6">
              <s.icon className="mb-4 h-7 w-7 text-blue-600" strokeWidth={1.75} aria-hidden="true" />
              <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
