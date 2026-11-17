// A screenshot of a workspace with four numbered callouts.
// Everything is drawn in one SVG so the callout points stay on the same spots of the screenshot at
// any width. The viewBox is the screenshot's own pixels (1646 x 1153, with the screenshot at 0,0)
// plus room on the left and on the right for the labels.

const BLUE = "#2563eb";

// Where each callout points, in screenshot pixels, and where its label sits.
const callouts = [
  {
    n: 1,
    title: "Menu",
    text: "Go home, open your profile and teams, set units and constants, and connect CAD.",
    side: "left" as const,
    y: 975,
    target: { x: 75, y: 975 },
  },
  {
    n: 2,
    title: "Submenu",
    text: "Add opens the items you can create here: documents, datasets, part trees, images and workspaces.",
    side: "left" as const,
    y: 665,
    target: { x: 98, y: 665 },
  },
  {
    n: 3,
    title: "Navigation",
    text: "The location trail shows where you are in the tree of workspaces.",
    side: "left" as const,
    y: 167,
    target: { x: 22, y: 167 },
  },
  {
    n: 4,
    title: "Items",
    text: "The documents and folders in the current workspace, with when each was created and last changed.",
    side: "right" as const,
    y: 386,
    target: { x: 1480, y: 386 },
  },
];

const LEFT_BADGE_X = -300;
const RIGHT_BADGE_X = 1726;

export default function WorkspaceTour() {
  return (
    <section id="workspace-tour" className="py-24 bg-white">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="mb-12 max-w-5xl">
          <h2 className="flex items-center gap-3 font-mono text-base font-semibold uppercase tracking-wider text-blue-600 before:h-[14px] before:w-[13px] before:shrink-0 before:bg-current before:content-[''] before:[clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)] after:h-px after:flex-1 after:bg-gradient-to-r after:from-gray-300 after:to-transparent after:content-['']">
            Inside a workspace
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-gray-700">
            Workspaces hold your documents, datasets, part trees and images, and can contain other workspaces.
          </p>
        </div>

        <svg
          viewBox="-340 -40 2240 1233"
          className="w-full h-auto"
          role="img"
          aria-label="A workspace listing example documents, with callouts for the menu, the submenu, the navigation and the items"
        >
          <image href="/samplwWorkspace.png" x="0" y="0" width="1646" height="1153" />
          <rect x="0" y="0" width="1646" height="1153" fill="none" stroke="#e5e7eb" strokeWidth="2" />

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
