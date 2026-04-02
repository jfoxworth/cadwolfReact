import {
  FileText,
  BookOpen,
  Star,
  MessageSquare,
  Mail,
  Rocket,
} from "lucide-react";

const items = [
  {
    Icon: FileText,
    link: "https://www.cadwolf.com/workspace/documentation",
    title: "Documentation",
    description:
      "Our documentation workspace provides a users guide that walks users through all facets of CADWOLF.",
  },
  {
    Icon: BookOpen,
    link: "https://www.cadwolf.com/workspace/homework",
    title: "Homework",
    description:
      "The homework workspace provides hundreds of examples in subjects such as physics, statics, dynamics, and mechanics of materials.",
  },
  {
    Icon: Star,
    link: "https://www.cadwolf.com/workspace/examples",
    title: "Examples",
    description:
      "The examples workspace provides a few examples designed to get the user started working with CADWOLF and using part trees.",
  },
  {
    Icon: MessageSquare,
    link: "https://www.reddit.com/r/CADWOLF/",
    title: "Reddit",
    description:
      "Visit our subreddit to ask general questions, address bugs, or suggest an improvement.",
  },
];

export default function Community() {
  return (
    <section id="community" className="py-24 bg-white">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            CADWOLF Examples and Community
          </h2>
          <p className="text-gray-500">How to get help and work with others</p>
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
