import {
  FileText,
  BookOpen,
  Star,
} from "lucide-react";

const items = [
  {
    Icon: FileText,
    link: "https://www.engentic.com/workspace/documentation",
    title: "Documentation",
    description:
      "Our documentation workspace provides a users guide that walks users through all facets of ENGENTIC.",
  },
  {
    Icon: BookOpen,
    link: "https://www.engentic.com/workspace/homework",
    title: "Homework",
    description:
      "The homework workspace provides hundreds of examples in subjects such as physics, statics, dynamics, and mechanics of materials.",
  },
  {
    Icon: Star,
    link: "https://www.engentic.com/workspace/examples",
    title: "Examples",
    description:
      "The examples workspace provides a few examples designed to get the user started working with ENGENTIC and using part trees.",
  }
];

export default function Community() {
  return (
    <section id="community" className="py-24 bg-gray-100">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="mb-12 max-w-5xl">
          <h2 className="flex items-center gap-3 font-mono text-base font-semibold uppercase tracking-wider text-blue-600 before:h-[14px] before:w-[13px] before:shrink-0 before:bg-current before:content-[''] before:[clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)] after:h-px after:flex-1 after:bg-gradient-to-r after:from-gray-300 after:to-transparent after:content-['']">
            Examples
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-gray-700">
            Open a workspace to see how Engentic is used.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-10">
          {items.map(({ Icon, link, title, description }) => (
            <a key={title} href={link} target="_blank" rel="noopener noreferrer" className="flex gap-4 group">
              <div className="flex-shrink-0">
                <Icon className="text-blue-600 mt-1 group-hover:text-blue-700 transition-colors" size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
