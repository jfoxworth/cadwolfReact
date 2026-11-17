// A screenshot of a document with four numbered callouts.
// Everything is drawn in one SVG so the callout points stay on the same spots of the screenshot at
// any width. The viewBox is the screenshot's own pixels (1480 x 1200, with the screenshot at 0,0)
// plus room on the left and on the right for the labels.

const BLUE = "#2563eb";

// Where each callout points, in screenshot pixels, and where its label sits.
const callouts = [
  {
    n: 1,
    title: "Menu",
    text: "Add blocks, go home, set units and constants, connect CAD, and save.",
    side: "left" as const,
    y: 1010,
    target: { x: 70, y: 1010 },
  },
  {
    n: 2,
    title: "Submenu",
    text: "The block types you can add: equations, plots, loops, sliders, text, images and more.",
    side: "left" as const,
    y: 650,
    target: { x: 215, y: 650 },
  },
  {
    n: 3,
    title: "Equation",
    text: "Equations are written and solved in the page, with units. The result sits next to the formula.",
    side: "right" as const,
    y: 610,
    target: { x: 990, y: 610 },
  },
  {
    n: 4,
    title: "Text",
    text: "Text and headers sit between the equations, so the calculation explains itself.",
    side: "right" as const,
    y: 800,
    target: { x: 1180, y: 800 },
  },
];

const LEFT_BADGE_X = -190;
const RIGHT_BADGE_X = 1560;

export default function DocumentTour() {
  return (
    <section id="document-tour" className="py-24 bg-white">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="mb-12 max-w-5xl">
          <h2 className="flex items-center gap-3 font-mono text-base font-semibold uppercase tracking-wider text-blue-600 before:h-[14px] before:w-[13px] before:shrink-0 before:bg-current before:content-[''] before:[clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)] after:h-px after:flex-1 after:bg-gradient-to-r after:from-gray-300 after:to-transparent after:content-['']">
            Inside a document
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-gray-700">
            A document is a list of blocks that solve in order. The main menu on the document is a section of hexagons. When clicked they open submenus that let you add items to the document or edit properties of the document.
          </p>
        </div>

        <svg
          viewBox="-540 -60 2440 1320"
          className="w-full h-auto"
          role="img"
          aria-label="A beam calculation document, with callouts for the menu, the submenu, an equation and text"
        >
          <image href="/sampleDocument.png" x="0" y="0" width="1480" height="1200" />
          <rect x="0" y="0" width="1480" height="1200" fill="none" stroke="#e5e7eb" strokeWidth="2" />

          {callouts.map((c) => {
            const left = c.side === "left";
            const badgeX = left ? LEFT_BADGE_X : RIGHT_BADGE_X;
            const textX = badgeX + 36;
            // The line runs from the label to the spot it points at.
            const lineStartX = left ? badgeX + 36 + c.title.length * 17 + 14 : badgeX - 22;
            return (
              <g key={c.n}>
                <line x1={lineStartX} y1={c.y} x2={c.target.x} y2={c.y} stroke={BLUE} strokeWidth="3" />
                <circle cx={c.target.x} cy={c.target.y} r="11" fill={BLUE} stroke="#ffffff" strokeWidth="3" />
                <circle cx={badgeX} cy={c.y} r="20" fill={BLUE} />
                <text
                  x={badgeX} y={c.y} textAnchor="middle" dominantBaseline="central"
                  fontSize="24" fontWeight="700" fill="#ffffff"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {c.n}
                </text>
                <g className="hidden md:block">
                  <text
                    x={textX} y={c.y} dominantBaseline="central"
                    fontSize="32" fontWeight="600" fill="#1f2937"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    {c.title}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {callouts.map((c) => (
            <div key={c.n} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {c.n}
              </span>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{c.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
