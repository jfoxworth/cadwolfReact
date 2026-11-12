import { Check, FileText, Network } from "lucide-react";

const uses = [
  {
    icon: FileText,
    title: "In documents",
    text: "The chat assistant works in three modes, so you choose how much it is allowed to touch.",
    groups: [
      {
        label: "Overview mode",
        points: [
          "Safely ask questions about the document without changing anything",
          "Get a summary, find problems, or discuss improvements without changing anything",
        ],
      },
      {
        label: "Inspect mode",
        points: [
          "Analyze and change one equation or block at a time without fear of mass changes to other blocks",
        ],
      },
      {
        label: "Build mode",
        points: [
          "Describe a problem and it adds equations, text and headers anywhere in the document",
          "Everything it adds is an ordinary block you can read and edit",
          "Changes appear straight away and every one can be undone",
        ],
      },
    ],
  },
  {
    icon: Network,
    title: "In part trees",
    text: "The same three modes apply, and the assistant can also build a whole tree from your requirements documents.",
    groups: [
      {
        label: "Overview mode",
        points: [
          "Ask questions about the structure of the tree without changing anything",
        ],
      },
      {
        label: "Inspect mode",
        points: [
          "Select a part, subsystem or requirements document and get answers about that item alone",
          "It reads the item's document when the question needs the real content",
        ],
      },
      {
        label: "Build mode",
        points: [
          "Add, rename, move and delete items in the tree, each applied when you approve it",
          "Build a whole tree from your requirements documents: it lays out the system, subsystems and parts",
          "Writes a design document for each, listing its requirements and interfaces",
          "Can draft a calculation document for each part",
        ],
      },
    ],
  },
];

export default function WhatIsEngentic() {
  return (
    <section id="how-it-works" className="py-24 bg-gray-50">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="mb-12">
          <h2 className="flex items-center gap-3 font-mono text-base font-semibold uppercase tracking-wider text-blue-600 before:h-[14px] before:w-[13px] before:shrink-0 before:bg-current before:content-[''] before:[clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)] after:h-px after:flex-1 after:bg-gradient-to-r after:from-gray-300 after:to-transparent after:content-['']">
            How Does Engentic Use AI
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-gray-700">
            AI is used in all 4 facets of the platform - documents, workspaces, datasets, and part trees. In workspaces, it mainly answers questions the user may have. In datasets, it can guide and assist the user in parsing data. However, the main use cases for AI are in documents and part trees.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-14">
          {uses.map((u) => (
            <div key={u.title} className="rounded-xl border border-gray-200 bg-white p-6">
              <u.icon className="mb-4 h-7 w-7 text-blue-600" strokeWidth={1.75} aria-hidden="true" />
              <h3 className="font-semibold text-gray-900 mb-2">{u.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{u.text}</p>
              <div className="space-y-5">
                {u.groups.map((g, i) => (
                  <div key={g.label ?? i}>
                    {g.label && (
                      <h4 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-blue-600">
                        {g.label}
                      </h4>
                    )}
                    <ul className="space-y-2">
                      {g.points.map((pt) => (
                        <li key={pt} className="flex items-start gap-2 text-sm text-gray-700">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
