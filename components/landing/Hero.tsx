import Image from "next/image";

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
        <div className="inline-block bg-white rounded-2xl shadow-lg px-8 py-5 mb-8">
          <Image src="/engenticLogo.png" alt="Engentic" width={560} height={120} priority />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Engineering and Agentic AI
        </h1>
        <p className="text-xl text-gray-200 mb-10 max-w-2xl mx-auto">
          ENGENTIC integrates AI to coordinate mathematics, documentation, CAD, 
          and to automate the design of large structures using AI
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
