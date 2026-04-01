const demos = [
  {
    img: "https://cadwolf.s3.us-west-2.amazonaws.com/stock/portfolio/Workspace1.png",
    title: "Workspace Example",
    tag: "Workspaces",
    href: "https://www.cadwolf.com/Workspace/Examples/",
  },
  {
    img: "https://cadwolf.s3.us-west-2.amazonaws.com/stock/portfolio/QE1.png",
    title: "Quadratic Equation",
    tag: "Documents",
    href: "https://www.cadwolf.com/Document/Examples/Quadratic_Equation/",
  },
  {
    img: "https://cadwolf.s3.us-west-2.amazonaws.com/stock/portfolio/Dataset1.png",
    title: "Dataset Example",
    tag: "Datasets",
    href: "https://www.cadwolf.com/Dataset/Examples/Tensile_Test/",
  },
  {
    img: "https://cadwolf.s3.us-west-2.amazonaws.com/stock/portfolio/BJ1.png",
    title: "Bungee Jumper",
    tag: "Documents",
    href: "https://www.cadwolf.com/Document/Examples/Bungee_Jumper_Problem/",
  },
  {
    img: "https://cadwolf.s3.us-west-2.amazonaws.com/stock/portfolio/3dChart1.png",
    title: "3D Charts",
    tag: "Documents",
    href: "https://www.cadwolf.com/Document/Documentation/Users_Guide_-_3D_Charts/",
  },
  {
    img: "https://cadwolf.s3.us-west-2.amazonaws.com/stock/portfolio/pt1.png",
    title: "Part Trees",
    tag: "Part Trees",
    href: "https://www.cadwolf.com/PartTree/Examples/Part_Tree_Example/Example_Part_Tree_-_Truss/",
  },
];

export default function Demos() {
  return (
    <section id="demos" className="py-24 bg-white">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Examples of Documents and other items
          </h2>
          <p className="text-gray-500">
            View screen captures or open samples of CADWOLF items
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {demos.map(({ img, title, tag, href }) => (
            <a
              key={title}
              href={href}
              className="group block rounded-lg overflow-hidden shadow hover:shadow-md transition-shadow"
            >
              <div className="overflow-hidden aspect-video bg-gray-100">
                <img
                  src={img}
                  alt={title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 bg-white">
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <span className="text-sm text-blue-600">{tag}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
