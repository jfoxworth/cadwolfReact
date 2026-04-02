export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center text-white text-center"
      style={{
        backgroundImage:
          "url('https://cadwolf.s3.us-west-2.amazonaws.com/stock/collageSlanted.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >

      <div className="relative z-10 max-w-3xl px-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Collaborative Mathematics and Engineering Platform
        </h1>
        <p className="text-xl text-gray-200 mb-10 max-w-2xl mx-auto">
          CADWOLF integrates mathematics, documentation, and CAD, as well as
          coordinates and automates the design of large structures
        </p>
        <a
          href="/register"
          className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-10 py-4 rounded-full text-lg transition-colors"
        >
          Create an Account
        </a>
      </div>
    </section>
  );
}
