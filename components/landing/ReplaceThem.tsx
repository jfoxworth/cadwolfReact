const logos = [
  {
    src: "https://s3-us-west-2.amazonaws.com/cadwolf/stock/logoWord.png",
    alt: "Word",
  },
  {
    src: "https://s3-us-west-2.amazonaws.com/cadwolf/stock/logoExcel.png",
    alt: "Excel",
  },
  {
    src: "https://s3-us-west-2.amazonaws.com/cadwolf/stock/logoMathcad.png",
    alt: "MathCAD",
  },
  {
    src: "https://s3-us-west-2.amazonaws.com/cadwolf/stock/logoJupyter.png",
    alt: "Jupyter",
  },
  {
    src: "https://s3-us-west-2.amazonaws.com/cadwolf/stock/logoMathematica.png",
    alt: "Mathematica",
  },
  {
    src: "https://s3-us-west-2.amazonaws.com/cadwolf/stock/logoMatlab.png",
    alt: "MATLAB",
  },
];

export default function ReplaceThem() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            More than a replacement
          </h2>
          <p className="text-gray-500">
            Don't just replace these platforms, expand their capabilities
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="grid grid-cols-3 gap-8 items-center">
            {logos.map((logo) => (
              <img
                key={logo.alt}
                src={logo.src}
                alt={logo.alt}
                className="max-h-12 mx-auto object-contain"
              />
            ))}
          </div>
          <p className="text-gray-600 text-lg leading-relaxed">
            CADWOLF is more than a free, online replacement for Word, Excel,
            Matlab, MathCAD, Mathematica, and Jupyter Notebook. CADWOLF's link
            to CAD platforms, its collaborative nature, and its part tree module
            make it a far better system for students, entrepreneurs, and large
            project managers.
          </p>
        </div>
      </div>
    </section>
  );
}
