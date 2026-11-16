import { readFileSync } from "fs";
import { join } from "path";
import type { Metadata } from "next";
import { Arrow, Card, Pill, Section } from "../diagram";
import { PromptButton, type PromptView } from "../PromptButton";
import { CHAT_TOOLS, SEARCH_TOOL } from "../../api/chat/tools";

export const metadata: Metadata = {
  title: "How the AI works in a document — Engentic",
};

// A picture of what the assistant on a Document page does today (app/api/chat/route.ts,
// app/api/chat/tools.ts, context/ChatContext.tsx, components/document/documentWrapper.tsx and
// prompts/_shared.md + prompts/document.md). It describes the process; it does not read any chat.

// The prompts are read from prompts/*.md every time the page is requested. They used to be read once,
// when the page's code was first loaded, so edits to a prompt did not show here until the server restarted.
export const dynamic = "force-dynamic";

const prompt = (file: string) => readFileSync(join(process.cwd(), "prompts", file), "utf-8");

function buildViews() {
const ALL_TOOLS = "equation_block, symbolic_equation_block, text_block, header_block, if_else_block, search_documents";
const TOOLS_NOTE = `${ALL_TOOLS} (Overview: only search_documents. Build uses its own three calls, shown below)`;
const ALSO_SENT =
  "your latest message, with the page address, a note that \"this\" means the whole document, the document as text and any images added to the front of it; and the earlier messages in the chat.";

const SYSTEM_PROMPT_VIEW: PromptView = {
  agent: "April, the document assistant",
  call: "System prompt, sent with every Overview and Inspect message",
  tool: TOOLS_NOTE,
  alsoSent: ALSO_SENT,
  prompt: `${prompt("_shared.md")}\n\n${prompt("document.md")}`,
};

const TOOLS_VIEW: PromptView = {
  agent: "April, the document assistant",
  call: "Tool definitions: what the model is told it can do",
  tool: TOOLS_NOTE,
  alsoSent: ALSO_SENT,
  prompt:
    "In Inspect mode the model is given all of these. In Overview mode it is given only search_documents. Build mode does not use these: it makes three calls with classify_request, solve_problem and write_document instead.\n\n" +
    JSON.stringify([...CHAT_TOOLS, SEARCH_TOOL], null, 2),
};

const PLATFORM_REFERENCE = prompt("document.md").split("\n## Modes")[0];
const BUILD_ALSO_SENT =
  "your latest message, with the page address, the document as text and any images added to the front of it; and the earlier messages in the chat. The solving and writing steps also get the scenario and problem statement from step 1 at the end of the message, and the platform reference, shown below the prompt.";

const CLASSIFY_VIEW: PromptView = {
  agent: "April, Build mode, step 1: setting up the task",
  call: "System prompt for the classifying call",
  tool: "classify_request",
  alsoSent:
    "your latest message, with the page address, the document as text and any images added to the front of it; and the earlier messages in the chat. This step does not get the platform reference.",
  prompt: `${prompt("_shared.md")}\n\n${prompt("document-classify.md")}`,
};

const SOLVE_VIEW: PromptView = {
  agent: "April, Build mode, step 2: the mathematics",
  call: "System prompt for the solving call",
  tool: "solve_problem, search_documents",
  alsoSent: BUILD_ALSO_SENT,
  prompt: `${prompt("_shared.md")}\n\n${prompt("document-solve.md")}`,
  appendixTitle: "Platform reference (equation syntax, units, functions, constants)",
  appendix: PLATFORM_REFERENCE,
};

const WRITE_VIEW: PromptView = {
  agent: "April, Build mode, step 3: writing the document",
  call: "System prompt for the writing call",
  tool: "write_document",
  alsoSent:
    BUILD_ALSO_SENT + " It is also given the solved steps from step 2, each with its equation, result and reason.",
  prompt: `${prompt("_shared.md")}\n\n${prompt("document-write.md")}`,
  appendixTitle: "Platform reference (equation syntax, units, functions, constants)",
  appendix: PLATFORM_REFERENCE,
};

return { SYSTEM_PROMPT_VIEW, TOOLS_VIEW, CLASSIFY_VIEW, SOLVE_VIEW, WRITE_VIEW };
}

export default function DocumentAiPage() {
  const { SYSTEM_PROMPT_VIEW, TOOLS_VIEW, CLASSIFY_VIEW, SOLVE_VIEW, WRITE_VIEW } = buildViews();
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">How the AI works in a document</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          On a document page, the chat panel talks to an assistant called April. It reads the document as you see it, can
          answer questions about it, and can add blocks or change the selected one. In Build mode it first sets the task up, then solves the maths, then writes the document around
          the solved equations. Its changes appear in the document straight away, and you can undo them.
        </p>

        {/* 1. One message */}
        <Section
          title="One message in Overview or Inspect mode"
          intro="Each message you send is one trip through these steps. The model has no memory of its own between messages. Everything it knows comes from what is sent with the message. Build mode works differently: see further down."
        >
          <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-stretch">
            <Card title="You" tone="slate" className="md:w-1/5">
              Type a message in the chat panel. You choose the model and how much effort it puts in.
            </Card>
            <Arrow />
            <Card title="Your browser" tone="slate" className="md:w-1/5">
              Keeps a text copy of the document up to date: one line per block, with each equation&apos;s solved value or
              its error. Sends it with your message and the earlier messages in the chat.
            </Card>
            <Arrow />
            <Card
              title="The server"
              tone="amber"
              className="md:w-1/5"
              action={<PromptButton view={SYSTEM_PROMPT_VIEW} />}
            >
              Checks you are allowed to use the chat. Puts the page address and the document text in front of your latest
              message, and sends it to the model with the system prompt and the tools that your mode allows.
            </Card>
            <Arrow />
            <Card
              title="The model"
              tone="blue"
              className="md:w-1/5"
              action={<PromptButton view={TOOLS_VIEW} />}
            >
              Replies with text, which streams into the chat as it is written, and with tool calls: to add or change
              blocks, or to search your other documents.
            </Card>
            <Arrow />
            <Card title="Your browser again" tone="teal" className="md:w-1/5">
              When the reply is finished, it applies all the block changes together and solves the new equations.
            </Card>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Card title="If the model searches your other documents" tone="slate">
              The server runs the search and gives the result back to the model, which carries on with it. This can happen
              up to 3 times in one message. After that the chat says it hit the limit.
            </Card>
            <Card title="If the answer is too long" tone="slate">
              The model stops at 16,000 tokens. The server then starts a continuation, telling the model what it has
              already done, up to 3 times. If it still isn&apos;t finished, the chat says so.
            </Card>
          </div>
        </Section>

        {/* 2. Modes */}
        <Section
          title="The three modes"
          intro="The mode decides what the model is allowed to do, and in Build how it works. You switch modes in the chat panel."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Card title="Overview" tone="violet">
              Talk only, about the document as a whole. The model is given only the search tool, so it cannot change the
              document. The browser also refuses to apply any change while you are in Overview.
            </Card>
            <Card title="Inspect" tone="violet">
              One block is selected. The model is given the block tools and is told to change only the selected block. That
              limit is in the prompt only. It works in one call, like Overview.
            </Card>
            <Card title="Build" tone="violet">
              Adds blocks to the document. Each message runs in three steps: the task is set up, the maths is solved and checked, then the
              document is written around it. See below.
            </Card>
          </div>
        </Section>

        {/* 2b. Build in three steps */}
        <Section
          title="Build mode: set up, solve, then write"
          intro="In Build mode a message is not one call to the model. It is three, each with its own instructions, so the task is clear before the maths is done and the maths can be checked before anyone writes about it."
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
            <Card
              title="1. Classify"
              tone="violet"
              className="md:w-1/4"
              action={<PromptButton view={CLASSIFY_VIEW} />}
            >
              The model reads the request and the document and writes two things: a scenario, which tells the next steps
              what job they are doing, and a problem statement with the problem, its inputs and the expected result. Both
              are added to the end of your message for the next two steps.
            </Card>
            <Arrow label="scenario and problem" />
            <Card
              title="2. Solve"
              tone="amber"
              className="md:w-1/4"
              action={<PromptButton view={SOLVE_VIEW} />}
            >
              The model is asked only for the equations, each with a short reason. The server solves them with the real
              solver, after the equations already in your document, and sends back every result and error. The model fixes
              what is wrong and tries again, up to 2 calls in all. Nothing reaches your document yet.
            </Card>
            <Arrow label="solved equations" />
            <Card
              title="3. Write"
              tone="blue"
              className="md:w-1/4"
              action={<PromptButton view={WRITE_VIEW} />}
            >
              A second call is given the solved equations and their reasons. It writes the summary, headers, text and
              symbolic formulas around them, and places each solved equation by its number, so it cannot change a value.
              It gets up to 2 tries.
            </Card>
            <Arrow label="checked by code" />
            <Card title="4. Checked and added" tone="teal" className="md:w-1/4">
              Code checks that every solved equation appears exactly once, in order, and that there is text. The blocks
              then reach your browser like any other change: applied together, solved, with Undo.
            </Card>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Card title="What the scenario and problem statement are" tone="slate">
              The scenario is a sentence to the next steps, such as &ldquo;You are adding equations to solve a problem that
              is explained only in text.&rdquo; The problem statement holds the problem, the inputs with their units as
              stated, and the expected result. When you ask to solve something, the expected result is solved equations. The
              classifying step does not change your numbers or start solving. If you name a standard problem and give no
              numbers, it chooses a simple example and says so. The document
              itself is not copied by the model: it is already part of your message. The classifying step is the only one
              that reads your own words as the task. The solving and writing steps work from what it produced.
            </Card>
            <Card title="If classifying fails" tone="slate">
              The model gets 3 tries to give both the scenario and the problem statement. If it still does not, the build
              carries on without them, as it did before this step existed.
            </Card>
            <Card title="If a problem can't be fixed" tone="slate">
              After 2 rounds the last version goes on to step 3 along with the problems that are left. The document says
              plainly that those are unresolved. It does not present them as solved.
            </Card>
            <Card title="If it needs no maths" tone="slate">
              For a question, a note or a heading, step 2 returns an empty list and step 3 answers or adds the blocks. That
              costs one extra short call.
            </Card>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Card title="Step 2: what each equation is sent with" tone="slate">
              Each equation the model submits has four fields: the equation itself (<b>raw</b>), a <b>role</b> (given,
              choice, calculation, check or output), a short reason (<b>why</b>), and a yes/no <b>positive</b> flag for
              results that must be above zero. The role is shown to step 3 beside each equation. The reason is what step 3
              turns into the explanation. The model can also search your other documents during this step.
            </Card>
            <Card title="Step 2: what the server checks after every attempt" tone="slate">
              After each attempt the server solves the equations and builds a list of problems. That list is sent back to
              the model, and the attempt is repeated until the list is empty or the 2 rounds are used. A problem is added
              when:
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>an entry has no &ldquo;=&rdquo; in it. It is skipped.</li>
                <li>an equation has no reason.</li>
                <li>the solver reports an error for an equation.</li>
                <li>a step with the role <b>check</b> gives anything other than 1 or 0.</li>
                <li>a check gives 0. The model is told not to weaken it, and the prompt tells it to change the design if the
                  problem asks for a design. If the problem is an analysis it keeps the result and step 3 says the check fails.</li>
                <li>a step marked <b>positive</b> gives a result that is zero or negative.</li>
              </ul>
              A failed check is handled by the same retry as an error. There is no separate loop. At most 120 equations are read.
            </Card>
            <Card title="If an attempt is cut off" tone="slate">
              If a call runs out of room (16,000 tokens) it is thrown away, the model is told to use fewer words, and it
              tries again. This counts as one of the rounds. If the model replies without calling the tool, it is told once to
              call it.
            </Card>
            <Card title="Step 3: what the server checks and what happens if it fails" tone="slate">
              The written blocks must include every solved equation once, in order, and some text, and are limited to 300
              blocks. If something is wrong the model is told and tries again, up to 2 calls in all. If it never produces a valid
              document, the server adds each solved equation with its reason as plain text and tells you it could not write
              the full explanation.
            </Card>
          </div>
        </Section>

        {/* 3. What the model sees */}
        <Section
          title="What the model is sent"
          intro="Everything below goes with every message. Nothing carries over except what is in the chat."
        >
          <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
            {[
              ["System prompt", "April's instructions: how to answer, then the platform reference (blocks, solver, units, functions, constants, CAD and dataset links), the modes, and how to propose changes."],
              ["Tools", "The list of things it may do, from the mode. Each has a description the model reads."],
              ["Page address and a note", "Which page you are on, and that \"this\" or \"it\" means the document as a whole."],
              ["The document, as text", "One line per block, with each equation's solved value, or its error. Rebuilt every time the document changes, so the model sees what is really solving now, including what it added last time."],
              ["Images", "Any image blocks in the document, sent as pictures."],
              ["Your message and the earlier ones", "The chat so far, as text. In your latest message, what you typed is in a section marked \"User prompt:\", after the page address and the document."],
              ["An empty document", "If the document has no blocks, the model is told \"the document is empty. This is a blank document, not a missing one.\""],
              ["Scenario and problem statement (Build only)", "Written by the classifying step and added to the end of your message for the solving and writing steps."],
            ].map(([name, does]) => (
              <div key={name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-slate-100 px-4 py-2 last:border-b-0">
                <span className="w-56 shrink-0 text-sm font-medium">{name}</span>
                <span className="text-xs text-slate-600">{does}</span>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Card title="A very large document" tone="slate">
              If the text of the document is over 100,000 characters, it is cut down in steps. First only headers, text and
              equations are kept. If that is still too large, only the first blocks are kept. In Inspect mode with a block
              selected, only the 10 blocks either side of it are kept. In each case the model is told the document is
              partial, so it should say so when you ask about the whole.
            </Card>
          </div>
        </Section>

        {/* 4. What it can change */}
        <Section
          title="What it can change"
          intro="In Inspect mode, five tools change the document. To change an existing block the tool names the block. To add one, it names a block to put the new one before or after. Build mode adds the same kinds of block (equations, symbolic equations, text and headers) through its writing step instead."
        >
          <div className="flex flex-wrap gap-2">
            <Pill tone="blue">equation_block</Pill>
            <Pill tone="blue">symbolic_equation_block</Pill>
            <Pill tone="blue">text_block</Pill>
            <Pill tone="blue">header_block</Pill>
            <Pill tone="blue">if_else_block</Pill>
            <Pill tone="slate">search_documents (finds content in your other documents)</Pill>
          </div>
          <div className="mt-3">
            <Card title="What it cannot do" tone="slate">
              Plots, images, video, sliders, dropdowns, select blocks, for and while loops, and cards. If you ask for one,
              it says it cannot and points you to the document&apos;s Add menu.
            </Card>
          </div>
        </Section>

        {/* 5. How a change is applied */}
        <Section
          title="How a change reaches the document"
          intro="This happens in your browser, once the model has finished its reply."
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
            <Card title="1. Applied together" tone="teal" className="md:w-1/4">
              Every change in the message is applied in one go, in the order the model gave them. No click is needed.
            </Card>
            <Arrow />
            <Card title="2. Placed" tone="teal" className="md:w-1/4">
              A change to an existing block replaces its content. A new block goes before or after the block it names.
              New blocks with the same anchor keep their order. With no usable anchor, a new block goes at the end.
            </Card>
            <Arrow />
            <Card title="3. Solved" tone="teal" className="md:w-1/4">
              Changed equations are solved, starting from the earliest one, and everything after it is solved again.
            </Card>
            <Arrow />
            <Card title="4. Reversible" tone="teal" className="md:w-1/4">
              Each change has an Undo in the chat. It restores the old content or removes the new block. Nothing is saved
              to the database until you click the document&apos;s Save button, the same as a manual edit.
            </Card>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            If a change can&apos;t be applied, for example because the block it names no longer exists, the chat shows it as
            failed and says why. The model finds out whether its equations solved from the document text it is sent with
            your next message.
          </p>
        </Section>

        {/* 6. Limits */}
        <Section title="Limits">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>The chat is limited to one allow-listed user for now.</li>
            <li>It cannot add or change plots, images, video, sliders, dropdowns, select blocks, loops or cards.</li>
            <li>In Inspect mode, staying on the selected block is a request in the prompt, not something the code enforces.</li>
            <li>In Inspect mode it cannot check an equation solves until the equation is in the document, so it only learns the result on your next message. Build mode checks first.</li>
            <li>In Build mode, new equations are solved after the equations already in the document. Variables that come from sliders, datasets, loops or CAD links are not passed to the server, so an equation using one will report it as undefined.</li>
            <li>Build mode adds blocks. It does not edit existing ones, because it has no way to know a block&apos;s id.</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}
