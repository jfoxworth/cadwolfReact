import { readFileSync } from "fs";
import { join } from "path";
import type { Metadata } from "next";
import { ClipboardList, FileText, Folder } from "lucide-react";
import { Arrow, Card, Pill, Section } from "../diagram";
import { PromptButton, type PromptView } from "../PromptButton";

export const metadata: Metadata = {
  title: "How the AI builds a part tree — Engentic",
};

// A picture of what the build does today (agents/ and prompts/agents/ in the repo; the written
// version is PART_TREE_BUILD_PROCESS.md). It describes the process; it does not read any build.

/** One row of the tree picture: an item, its design document, and (for a part) its own document. */
function TreeRow({
  depth, icon, name, design, doc,
}: { depth: number; icon: "folder" | "part"; name: string; design?: string; doc?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-1" style={{ paddingLeft: depth * 28 }}>
      {icon === "part" ? <FileText className="h-4 w-4 text-slate-500" /> : <Folder className="h-4 w-4 text-amber-500" />}
      <span className="text-sm font-medium text-slate-900">{name}</span>
      {design && (
        <Pill tone="teal"><ClipboardList className="h-3 w-3" />{design}</Pill>
      )}
      {doc && <Pill tone="blue"><FileText className="h-3 w-3" />part document</Pill>}
    </div>
  );
}

const STEPS = [
  {
    n: 1, name: "Structure",
    does: "Decides which systems and parts sit directly beneath, how many of each there are, and the order to design them in.",
    check: "Repeated names are removed.",
  },
  {
    n: 2, name: "Requirements",
    does: "Decides which of the flagged requirements apply to which item.",
    check: "Every requirement gets exactly one answer. If the AI skips one, it is passed to everything beneath and the log says so.",
  },
  {
    n: 3, name: "Interfaces",
    does: "For each item, lists what it needs from other items and what it has to provide.",
    check: "Only items that exist are kept. If an input comes from something that isn't a sibling, the log says so.",
  },
  {
    n: 4, name: "Details",
    does: "Pulls out the values and facts the documents state (loads, dimensions, materials) and what they say about how each item is built.",
    check: "Only items that exist are kept.",
  },
  {
    n: 5, name: "Orientation",
    does: "Writes a short briefing, in plain sentences, for whoever picks each item up next.",
    check: "If an item has no briefing, the log says so.",
  },
];

// The prompts shown in the "View prompt" modals are the files the agents actually read
// (agents/coordinator.ts and agents/partAgent.ts), so this page can't drift from them.
const PROMPT_DIR = join(process.cwd(), "prompts", "agents");
const readPrompt = (...path: string[]) => readFileSync(join(PROMPT_DIR, ...path), "utf-8");

const STEP_FILES = ["structure", "requirements", "interfaces", "details", "orientation"];
const STEP_TOOLS = ["report_structure", "assign_requirements", "report_interfaces", "report_details", "write_orientation"];

function coordinatorView(index: number): PromptView {
  return {
    agent: "Main coordinator and system coordinators (they use the same prompts)",
    call: `Step ${index + 1}: ${STEPS[index].name}`,
    tool: STEP_TOOLS[index],
    alsoSent:
      "the build request; the requirements documents in full; the part tree as it exists; the list of requirements to assign; the answers from the earlier steps. A system coordinator also gets the design document above it and what that design hands to the system.",
    prompt: `${readPrompt("coordinator.md")}\n\n${readPrompt("passes", `${STEP_FILES[index]}.md`)}`,
  };
}

const PART_CALCULATION_VIEW: PromptView = {
  agent: "Part agent",
  call: "Stage 1: write the calculation",
  tool: "write_calculation (and lookup_material)",
  alsoSent: "the build request; the part's design document in full; the list of values it can import.",
  prompt: readPrompt("part-calculation.md"),
  appendixTitle: "Platform reference (equation syntax, units, functions, constants)",
  appendix: readFileSync(join(process.cwd(), "prompts", "document.md"), "utf-8").split("\n## Modes")[0],
};

const PART_DOCUMENT_VIEW: PromptView = {
  agent: "Part agent",
  call: "Stage 2: write the document",
  tool: "write_document",
  alsoSent:
    "the part's design document in full; the values imported; the solved steps with their results and reasons; any unresolved problems.",
  prompt: readPrompt("part-document.md"),
};

const SECTIONS = [
  { name: "Orientation", kind: "prose", does: "A short briefing for whoever works on this item next: what it is for, where it sits, what it has to get right." },
  { name: "Structure", kind: "data", does: "What kind of item it is, its path from the top of the tree (where it sits in the whole), how many identical copies there are, its siblings, and what is inside it." },
  { name: "Requirements", kind: "data", does: "Each requirement that applies: its id, the document it came from, its text, and who it applies to." },
  { name: "Interfaces", kind: "data", does: "What each item needs and where it comes from, and what each item has to provide." },
  { name: "Given parameters", kind: "data", does: "Values and facts the documents state." },
  { name: "Design intent", kind: "data", does: "What the documents say about how each item is built and connected, so the next agent doesn't need the original documents." },
  { name: "Open questions", kind: "data", does: "What the AI couldn't decide from the documents." },
];

export default function PartTreeProcessPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">How the AI builds a part tree</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          You write requirements documents and press build. The AI reads them, decides which systems and parts there are,
          and writes a design document for each one. If you ask for it, it then writes each part&apos;s document. Every step
          leaves a document behind, so you can read what the AI decided.
        </p>

        {/* 1. The whole flow */}
        <Section
          title="The whole build"
          intro="The order is fixed in the code. No AI decides what runs next. A step runs only after the design document it needs has been written."
        >
          <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-stretch">
            <Card title="Your input" tone="slate" className="md:w-1/5">
              Requirements documents with flagged requirements, any folders you have already made, and a prompt.
            </Card>
            <Arrow />
            <Card title="Main coordinator" tone="amber" className="md:w-1/5">
              Runs once. Reads the top-level requirements documents. Decides the first systems and parts, writes the design
              document for the whole tree, and creates them.
            </Card>
            <Arrow label="one per system" />
            <Card title="System coordinators" tone="amber" className="md:w-1/5">
              One for each system. Each reads the design document above it and any requirements documents of its own,
              writes its own design document, and creates the systems and parts inside it. This repeats down the tree.
            </Card>
            <Arrow label="one per part" />
            <Card title="Part agents" tone="blue" className="md:w-1/5">
              One for each part. Reads that part&apos;s design document, works out the design, then writes the part&apos;s
              document as a separate second stage.
            </Card>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            With &ldquo;Design documents only&rdquo; checked, the build stops before the part agents, so you can check the
            design before paying for the parts. If one item fails, the build reports it and carries on with the others.
          </p>
        </Section>

        {/* 2. The tree picture */}
        <Section
          title="What ends up in the part tree"
          intro="Every system and part gets a design document. A system's design document is written by that system's own coordinator and saved inside the system. A part's design document is written by the coordinator of the system that contains the part, and saved next to the part. The part's own document, the actual calculation, is written last by the part agent."
        >
          <div className="rounded-lg border border-slate-300 bg-white p-4">
            <TreeRow depth={0} icon="folder" name="Part tree" design="Design: Part tree  (main coordinator)" />
            <TreeRow depth={1} icon="folder" name="System A" design="Design: System A  (System A's coordinator)" />
            <TreeRow depth={2} icon="part" name="Part A1" design="Design: Part A1  (System A's coordinator)" doc />
            <TreeRow depth={2} icon="part" name="Part A2" design="Design: Part A2  (System A's coordinator)" doc />
            <TreeRow depth={1} icon="folder" name="System B" design="Design: System B  (System B's coordinator)" />
            <TreeRow depth={2} icon="part" name="Part B1" design="Design: Part B1  (System B's coordinator)" doc />
            <TreeRow depth={1} icon="part" name="Part C  (directly under the part tree)" design="Design: Part C  (main coordinator)" doc />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            <Pill tone="teal"><ClipboardList className="h-3 w-3" />design document: grey name and teal icon in the tree, not indexed for search, replaced if you build again</Pill>
            <Pill tone="blue"><FileText className="h-3 w-3" />part document: the real calculation document</Pill>
          </div>
        </Section>

        {/* 3. The five steps */}
        <Section
          title="How a coordinator decides: five steps"
          intro="Each coordinator works in five separate AI calls, one after another. Each call has one job and is given what the earlier calls decided. After each call, the code checks the result before the next call starts. The main coordinator and the system coordinators make the same five calls on different material. The main coordinator works from the top-level requirements documents and writes the Orientation for the whole tree. A system coordinator works from the design document above it plus its own requirements documents, and its own Orientation was written by the coordinator above it."
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
            {STEPS.map((p, i) => (
              <div key={p.n} className="flex flex-col gap-2 md:flex-1 md:flex-row md:items-stretch">
                <div className="flex-1 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">{p.n}</span>
                    <span className="text-sm font-semibold">{p.name}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-700">{p.does}</p>
                  <p className="mt-2 border-t border-amber-200 pt-2 text-[11px] text-slate-500"><b>Checked by the code:</b> {p.check}</p>
                  <PromptButton view={coordinatorView(i)} />
                </div>
                {i < STEPS.length - 1 && <Arrow />}
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Card title="After the five steps" tone="slate">
              The code writes this level&apos;s design document, creates the systems and parts that were listed (any that
              already exist are left as they are), and writes a design document for each part.
            </Card>
          </div>
        </Section>

        {/* 4. Scope */}
        <Section
          title="Where a requirement goes"
          intro="In step 2 each flagged requirement is given one of three answers, so it only reaches the items it applies to."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Card title="Everything beneath" tone="violet">Applies to this system and to everything inside it. Example: a minimum factor of safety. It is passed to every item below.</Card>
            <Card title="This system only" tone="violet">Applies to this system as a whole and is not passed down. Example: a total mass limit that is checked here.</Card>
            <Card title="Named items" tone="violet">Applies only to the items named. It is passed to those items and to no others.</Card>
          </div>
        </Section>

        {/* 5. The design document */}
        <Section
          title="What is in a design document"
          intro="Every design document has the same sections, whether it is for the whole tree, a system or a part. Except for the Orientation, each section is stored as structured data that the next agent reads as it is."
        >
          <div className="overflow-hidden rounded-lg border border-teal-300 bg-white">
            <div className="flex items-center gap-2 border-b border-teal-300 bg-teal-100 px-4 py-2 text-sm font-semibold text-teal-900">
              <ClipboardList className="h-4 w-4" /> Design: item name
            </div>
            {SECTIONS.map((s) => (
              <div key={s.name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-slate-100 px-4 py-2 last:border-b-0">
                <span className="w-40 shrink-0 text-sm font-medium">{s.name}</span>
                <Pill tone={s.kind === "prose" ? "amber" : "slate"}>{s.kind}</Pill>
                <span className="text-xs text-slate-600">{s.does}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 6. Part agent */}
        <Section
          title="What a part agent does"
          intro="A part agent works in two stages. First it works out the design, and the server checks it. Then a second AI call writes the document a person reads. The two jobs are kept apart so the design can be checked on its own, and so the writing can't change the numbers."
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stage 1: work out the design</div>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-stretch">
            <Card title="Reads" tone="teal" className="md:w-1/3">
              The part&apos;s design document, starting with the Orientation. It can also use values from the requirements
              that apply to it and from parts already built next to it.
            </Card>
            <Arrow />
            <Card title="Writes the calculation" tone="blue" className="md:w-1/3" action={<PromptButton view={PART_CALCULATION_VIEW} />}>
              A list of equations in order. Each one has a role (given, choice, calculation, check or output), a
              one-sentence reason, and a note on whether the result must be above zero. It can look up built-in material
              properties.
            </Card>
            <Arrow />
            <Card title="Solved and checked on the server" tone="slate" className="md:w-1/3">
              Every equation is solved with the same solver the app uses. The agent is sent back to fix any equation that
              doesn&apos;t solve, any check that fails, any result that should be above zero and isn&apos;t, and any step
              with no reason. Up to 6 rounds.
            </Card>
          </div>
          <div className="my-3 flex justify-center">
            <Arrow label="solved calculation, with each step's reason" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stage 2: write the document</div>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-stretch">
            <Card title="Writes the document" tone="blue" className="md:w-1/3" action={<PromptButton view={PART_DOCUMENT_VIEW} />}>
              A separate AI call gets the solved steps and their reasons and writes the headings and text: what the part
              is, how the design was reached, what the checks show. It places each equation by its number.
            </Card>
            <Arrow />
            <Card title="Checked by the code" tone="slate" className="md:w-1/3">
              Every equation must appear exactly once, in order, so the text can&apos;t change or drop one. If this still
              fails after 3 tries, a plain document is built from the steps and their reasons.
            </Card>
            <Arrow />
            <Card title="Saved" tone="blue" className="md:w-1/3">
              The part document is saved. If problems were left after stage 1, the document says so in an
              &ldquo;Unresolved&rdquo; section. A part document that already has content you wrote is left alone.
            </Card>
          </div>
        </Section>

        {/* 7. Not built */}
        <Section title="Not built yet">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>A separate review of finished part documents for mistakes the code checks can&apos;t catch.</li>
            <li>Reading reference links in a requirements document.</li>
            <li>Rebuilding only some systems or parts.</li>
            <li>Asking you to approve a system&apos;s design before the build continues.</li>
            <li>Making the new part documents searchable by the chat assistant.</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}
