import Image from "next/image";

// Decorative honeycomb behind the hero text. Pointy-top hexagons of radius R tiled over a fixed
// 1600x900 canvas that is scaled to cover the hero. Each cell's glow is delayed by its distance along
// the diagonal, so a soft wave sweeps across. Values are computed, not random, so the server and
// browser render the same thing.
const R = 40;
const W = 1600;
const H = 900;
const CELL_W = Math.sqrt(3) * R;
const ROW_H = 1.5 * R;
const POINTS = Array.from({ length: 6 }, (_, k) => {
  const a = (Math.PI / 180) * (60 * k - 30);
  return `${(R * Math.cos(a)).toFixed(2)},${(R * Math.sin(a)).toFixed(2)}`;
}).join(" ");
const CELLS: { x: number; y: number; delay: number }[] = [];
for (let row = 0; row * ROW_H < H + R; row++) {
  for (let col = 0; col * CELL_W < W + CELL_W; col++) {
    CELLS.push({
      x: col * CELL_W + (row % 2 ? CELL_W / 2 : 0),
      y: row * ROW_H,
      delay: -(col + row) * 0.14,
    });
  }
}

export default function Hero() {
  return (
    <section
      className="relative min-h-screen overflow-hidden flex items-center justify-center text-white text-center"
    >
      <style>{`
        @keyframes hero-hex-glow {
          0%, 100% { fill-opacity: 0; }
          18% { fill-opacity: 0.4; }
          40% { fill-opacity: 0; }
        }
        .hero-hex { fill: #60a5fa; fill-opacity: 0; animation: hero-hex-glow 9s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .hero-hex { animation: none; } }
      `}</style>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{
          maskImage: "linear-gradient(to bottom, black 45%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 45%, transparent 100%)",
        }}
      >
        {CELLS.map((c, i) => (
          <polygon
            key={i}
            points={POINTS}
            transform={`translate(${c.x.toFixed(2)} ${c.y})`}
            className="hero-hex"
            stroke="rgba(191,219,254,0.25)"
            strokeWidth={1.5}
            style={{ animationDelay: `${c.delay.toFixed(2)}s` }}
          />
        ))}
      </svg>

      <div className="relative z-10 max-w-3xl px-6">
        <div className="inline-block bg-white rounded-2xl shadow-lg px-8 py-5 mb-8">
          <Image src="/engenticLogo.png" alt="Engentic" width={560} height={120} priority />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-gray-900">
          Engineering and Agentic AI
        </h1>
        <p className="text-xl text-gray-800 mb-10 max-w-2xl mx-auto">
          ENGENTIC integrates AI into every aspect of the engineering process. Simultaneously solve and document any problem or build a complete system from requirements documents.
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
