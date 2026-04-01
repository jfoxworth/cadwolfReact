const panels = [
  {
    title: "Documents — Analysis and Documentation",
    description:
      "Documents are the backbone of CADWOLF. They are created and edited through GUIs and can be thought of as a Google Doc that has all the power of a programming language.",
    image: "https://s3-us-west-2.amazonaws.com/cadwolf/stock/portfolio/DemoDocument1.png",
    alt: "Documents",
    link: "/Modules",
    linkText: "More Info on Documents",
    imageRight: false,
  },
  {
    title: "Workspaces — Create, Store, and Organize Files",
    description:
      "Workspaces act as folders in CADWOLF and provide a place where users can create and locate files, address permissions, and upload images.",
    image: "https://s3-us-west-2.amazonaws.com/cadwolf/stock/portfolio/DemoWorkspace1.png",
    alt: "Workspaces",
    link: "/Modules",
    linkText: "More Info on Workspaces",
    imageRight: true,
  },
  {
    title: "Part Trees — Build Something",
    description:
      "Part trees let users establish a part numbering scheme and then build large structures — piece by piece. This provides instant feedback from CAD models and design documents, as well as one place to access all files.",
    image: "https://s3-us-west-2.amazonaws.com/cadwolf/stock/portfolio/DemoPartTree1.png",
    alt: "Part Trees",
    link: "/Modules",
    linkText: "More Info on Part Trees",
    imageRight: false,
  },
];

export default function OverviewPanels() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">What CADWOLF Does</h2>
          <p className="text-gray-500">
            The platform consists of several modules that can be used to solve a simple
            problem or manage an entire STEM project
          </p>
        </div>

        {panels.map((panel, i) => (
          <div key={panel.title}>
            <div className="grid md:grid-cols-2 gap-16 items-center py-12">
              <div className={panel.imageRight ? "order-1 md:order-2" : ""}>
                <img
                  src={panel.image}
                  alt={panel.alt}
                  className="rounded-lg shadow-lg w-full"
                />
              </div>
              <div className={panel.imageRight ? "order-2 md:order-1" : ""}>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{panel.title}</h2>
                <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                  {panel.description}
                </p>
                <a
                  href={panel.link}
                  className="inline-block bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-500 transition-colors"
                >
                  {panel.linkText}
                </a>
              </div>
            </div>
            {i < panels.length - 1 && <hr className="border-gray-200" />}
          </div>
        ))}
      </div>
    </section>
  );
}
