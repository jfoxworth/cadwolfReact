import type { Metadata } from "next";
import { Arrow, Card, Pill, Section } from "../diagram";
import { PromptButton, type PromptView } from "../PromptButton";
import { InfoButton } from "../InfoButton";
import type Anthropic from "@anthropic-ai/sdk";
import { getDocumentTools, SEARCH_TOOL } from "../../api/chat/tools";
import { getSystemPrompt } from "../../api/chat/systemPrompt";
import {
  CLASSIFY_TOOL, SOLVE_PROBLEM_TOOL, WRITE_DOCUMENT_TOOL,
  classifySystemPrompt, solveSystemPrompt, writeSystemPrompt,
} from "../../api/chat/documentBuild";

export const metadata: Metadata = {
  title: "How the AI works in a document — Engentic",
};

// A picture of what the assistant on a Document page does today (app/api/chat/route.ts,
// app/api/chat/tools.ts, context/ChatContext.tsx, components/document/documentWrapper.tsx and
// prompts/_shared.md + prompts/document.md). It describes the process; it does not read any chat.

// The prompts are read from prompts/*.md every time the page is requested. They used to be read once,
// when the page's code was first loaded, so edits to a prompt did not show here until the server restarted.
export const dynamic = "force-dynamic";

function buildViews() {
// Every prompt and tool list below is built by the same code that builds it for the model (getSystemPrompt,
// getDocumentTools, classifySystemPrompt, solveSystemPrompt, writeSystemPrompt and the tool objects), not
// copied here, so what this page shows is what is sent. Only the "also sent" sentences are written by hand.
const toolNames = (tools: Anthropic.Tool[]) => tools.map((t) => t.name).join(", ");
const toolJson = (tools: Anthropic.Tool[]) => JSON.stringify(tools, null, 2);

const ALSO_SENT =
  "your latest message, with the page address, a note that \"this\" means the whole document, the document as text and any images added to the front of it; and the earlier messages in the chat.";
const INSPECT_ALSO_SENT =
  "your latest message, with the page address, a note that \"this\" means the selected block, a note naming the selected block (its id, type, name and content), the document as text and any images added to the front of it; and the earlier messages in the chat. If no block is selected there is no selection note, and \"this\" means the whole document.";

const OVERVIEW_TOOLS = getDocumentTools("overview");
const INSPECT_TOOLS = getDocumentTools("inspect");
const CHAT_SYSTEM_PROMPT = getSystemPrompt("document");

const OVERVIEW_VIEW: PromptView = {
  agent: "April, Overview mode",
  call: "System prompt, sent with every Overview message",
  tool: toolNames(OVERVIEW_TOOLS),
  toolDefinitions: toolJson(OVERVIEW_TOOLS),
  alsoSent: ALSO_SENT,
  prompt: CHAT_SYSTEM_PROMPT,
};

const INSPECT_VIEW: PromptView = {
  agent: "April, Inspect mode",
  call: "System prompt, sent with every Inspect message",
  tool: toolNames(INSPECT_TOOLS),
  toolDefinitions: toolJson(INSPECT_TOOLS),
  alsoSent: INSPECT_ALSO_SENT,
  prompt: CHAT_SYSTEM_PROMPT,
};

const BUILD_ALSO_SENT =
  "your latest message, with the page address, the document as text and any images added to the front of it; and the earlier messages in the chat. The solving and writing steps also get the scenario and problem statement from step 1 at the end of the message.";

const CLASSIFY_VIEW: PromptView = {
  agent: "April, Build mode, step 1: setting up the task",
  call: "System prompt for the classifying call",
  tool: toolNames([CLASSIFY_TOOL]),
  toolDefinitions: toolJson([CLASSIFY_TOOL]),
  alsoSent:
    "your latest message, with the page address, the document as text and any images added to the front of it; and the earlier messages in the chat. This step does not get the platform reference.",
  prompt: classifySystemPrompt(),
};

const SOLVE_VIEW: PromptView = {
  agent: "April, Build mode, step 2: the mathematics",
  call: "System prompt for the solving call",
  tool: toolNames([SOLVE_PROBLEM_TOOL, SEARCH_TOOL]),
  toolDefinitions: toolJson([SOLVE_PROBLEM_TOOL, SEARCH_TOOL]),
  alsoSent: BUILD_ALSO_SENT,
  prompt: solveSystemPrompt(),
};

const WRITE_VIEW: PromptView = {
  agent: "April, Build mode, step 3: writing the document",
  call: "System prompt for the writing call",
  tool: toolNames([WRITE_DOCUMENT_TOOL]),
  toolDefinitions: toolJson([WRITE_DOCUMENT_TOOL]),
  alsoSent:
    BUILD_ALSO_SENT + " It is also given the solved steps from step 2, each with its equation, result and reason.",
  prompt: writeSystemPrompt(),
};

return { OVERVIEW_VIEW, INSPECT_VIEW, CLASSIFY_VIEW, SOLVE_VIEW, WRITE_VIEW };
}

export default function DocumentAiPage() {
  const { OVERVIEW_VIEW, INSPECT_VIEW, CLASSIFY_VIEW, SOLVE_VIEW, WRITE_VIEW } = buildViews();
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">How the AI works in a document</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          On a document page, the chat panel talks to an assistant called April. It reads the document as you see it, can
          answer questions about it, and can add blocks or change the selected one. In Build mode it first sets the task up, then solves the maths, then writes the document around
          the solved equations. Its changes appear in the document straight away, and you can undo them.
        </p>

        {/* 1. Modes */}
        <Section
          title="The three modes"
          intro="The mode decides what the model is allowed to do, and in Build how it works. You switch modes in the chat panel. In Overview and Inspect each message is one call to the model. It has no memory of its own between messages: everything it knows comes from what is sent with the message."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Card title="Overview" tone="violet">
              Talk only, about the document as a whole. The model is given only the search tool, so it cannot change the
              document. The browser also refuses to apply any change while you are in Overview.
            </Card>
            <Card title="Inspect" tone="violet">
              Changes the block you have selected. The model is given the block tools and a note naming the selected
              block, and the browser refuses an edit to any other block. It can still add new blocks. It works in one
              call, like Overview.
            </Card>
            <Card title="Build" tone="violet">
              Adds blocks to the document. Each message runs in three steps: the task is set up, the maths is solved and checked, then the
              document is written around it. See below.
            </Card>
          </div>
        </Section>

        {/* 2a. Overview */}
        <Section
          title="Overview mode: ask and answer"
          intro="Overview is for questions about the document. Each message is one call to the model, which can read the document and search your other documents but has no way to change anything."
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
            <Card title="1. You" tone="slate" className="md:w-1/5">
              Choose Overview, pick the model and how much effort it puts in, and type a question.
            </Card>
            <Arrow />
            <Card title="2. Your browser" tone="slate" className="md:w-1/5">
              Sends your message and the earlier messages in the chat, the document as text (one line per block, with each
              equation&apos;s solved value or its error), any images, and the mode.
            </Card>
            <Arrow />
            <Card
              title="3. The server"
              tone="amber"
              className="md:w-1/5"
              action={<PromptButton view={OVERVIEW_VIEW} />}
            >
              Checks you are allowed to use the chat. Puts the page address, a note that &ldquo;this&rdquo; means the whole
              document, and the document text in front of your latest message, with what you typed under &ldquo;User
              prompt:&rdquo;. Sends it with the system prompt and one tool: search_documents.
            </Card>
            <Arrow />
            <Card
              title="4. The model"
              tone="blue"
              className="md:w-1/5"
            >
              Answers in text, which streams into the chat as it is written. It can search your other documents. It has no
              tool to change a block, so if you ask for a change it says Overview is read-only and points you to Inspect or
              Build.
            </Card>
            <Arrow />
            <Card title="5. The chat" tone="teal" className="md:w-1/5">
              Shows the reply. Nothing in the document changes.
            </Card>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <InfoButton label="If the model searches your other documents">
              <p>
                The server runs the search and gives the result back to the model, which carries on with it. This can happen
                up to 3 times in one message. After that the chat says it hit the limit.
              </p>
            </InfoButton>
            <InfoButton label="If the answer is too long">
              <p>
                The model stops at 16,000 tokens. The server then starts a continuation, telling the model what it has
                already done, up to 3 times. If it still isn&apos;t finished, the chat says so.
              </p>
            </InfoButton>
            <InfoButton label="How the model knows it is in Overview">
              <p>
                The message tells it: a note in front of your message says the mode is Overview, that it cannot change the
                document, and that if you ask it to add, edit or delete anything it should say plainly that Overview is
                read-only and that you can switch to Inspect or Build.
              </p>
              <p className="mt-3">
                It is also only given the search tool. The system prompt is the same in every mode, and it also lists the
                block tools that Overview does not give the model.
              </p>
            </InfoButton>
            <InfoButton label="If a change gets through anyway">
              <p>
                It should not be possible, because the model has no block tools in Overview. As a second check, the browser
                refuses to apply any change while you are in Overview and shows it in the chat as failed, with the reason.
              </p>
            </InfoButton>
          </div>
        </Section>

        {/* 2b. Inspect */}
        <Section
          title="Inspect mode: change one block"
          intro="Inspect is for changing the block you have selected: text, a header, an equation, a symbolic equation or an if/else block. Each message is one call to the model, which is given the block tools as well as search."
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
            <Card title="1. You" tone="slate" className="md:w-1/5">
              Choose Inspect, select a block if you want to point at one, and type a request.
            </Card>
            <Arrow />
            <Card title="2. Your browser" tone="slate" className="md:w-1/5">
              Sends the same as in Overview, and a note naming the selected block: its id, type, name and content. For a
              large document with a block selected, only the 10 blocks either side of it are sent.
            </Card>
            <Arrow />
            <Card
              title="3. The server"
              tone="amber"
              className="md:w-1/5"
              action={<PromptButton view={INSPECT_VIEW} />}
            >
              Does the same as in Overview, with the same system prompt, but gives the model all five block tools as well as
              search_documents. It puts the selection note in front of your message, and &ldquo;this&rdquo; then means the
              selected block.
            </Card>
            <Arrow />
            <Card
              title="4. The model"
              tone="blue"
              className="md:w-1/5"
            >
              Replies in text and with tool calls. To change a block, a call names it. To add one, a call names a block to
              put the new one before or after. The prompt tells it to change only the selected block.
            </Card>
            <Arrow />
            <Card title="5. Your browser again" tone="teal" className="md:w-1/5">
              Refuses an edit to any block other than the selected one. When the reply is finished, it applies the rest
              together, solves the new equations, and gives each change an Undo. See &ldquo;How a change reaches the
              document&rdquo; below.
            </Card>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <InfoButton label="Which block it works on">
              <p>
                The chat panel knows which block you have selected, and sends a note about it with each message: the
                block&apos;s id, type, name and a line about its content. In Inspect mode the server puts that note in front
                of your message, so the model can name the block when it edits it. Block ids are not in the document text,
                so this note is where the model gets the id. In Overview and Build the note is not passed on.
              </p>
              <p className="mt-3">
                The prompt tells the model to change only the selected block. Your browser also checks it. An edit is only
                applied if its target is the block that was selected when you sent the message. Any other edit is shown in
                the chat as failed, with the reason, and nothing changes. If no block was selected, every edit is refused.
              </p>
              <p className="mt-3">
                An edit tool only changes a block of its own kind. A text edit cannot overwrite an equation: it fails with a
                message saying what kind of block it is.
              </p>
              <p className="mt-3">
                Adding a block is not an edit, so the model can still add new blocks. If it adds one without saying where,
                the browser places it after the selected block.
              </p>
              <p className="mt-3">
                The selection also decides which blocks are kept in the text for a large document: the 10 either side.
              </p>
            </InfoButton>
            <InfoButton label="It can't check its own equations">
              <p>
                In Inspect mode the model cannot tell whether an equation solves until the equation is in the document. It
                learns the result from the document text sent with your next message. Build mode checks the maths on the
                server before anything is written.
              </p>
            </InfoButton>
            <InfoButton label="If the model searches your other documents">
              <p>
                The server runs the search and gives the result back to the model, which carries on with it. This can happen
                up to 3 times in one message. After that the chat says it hit the limit.
              </p>
            </InfoButton>
            <InfoButton label="If the answer is too long">
              <p>
                The model stops at 16,000 tokens. The server then starts a continuation, telling the model what it has
                already done, up to 3 times. If it still isn&apos;t finished, the chat says so.
              </p>
            </InfoButton>
            <InfoButton label="What it cannot change">
              <p>
                Plots, images, video, sliders, dropdowns, select blocks, for and while loops, and cards. If you ask for one,
                it says it cannot and points you to the document&apos;s Add menu.
              </p>
            </InfoButton>
          </div>
        </Section>

        {/* 2c. Build in three steps */}
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
          <div className="mt-4 flex flex-wrap gap-2">
            <InfoButton label="What the scenario and problem statement are">
              <p>
                The scenario is a sentence to the next steps, such as &ldquo;You are adding equations to solve a problem
                that is explained only in text.&rdquo; The problem statement holds the problem, the inputs with their units
                as stated, and the expected result. When you ask to solve something, the expected result is solved
                equations.
              </p>
              <p className="mt-3">
                The classifying step does not change your numbers or start solving. If you name a standard problem and give
                no numbers, it chooses a simple example and says so.
              </p>
              <p className="mt-3">
                The document itself is not copied by the model: it is already part of your message. The classifying step is
                the only one that reads your own words as the task. The solving and writing steps work from what it
                produced.
              </p>
            </InfoButton>
            <InfoButton label="If classifying fails">
              <p>
                The model gets 2 tries to give both the scenario and the problem statement. If it still does not, the build
                carries on without them, as it did before this step existed.
              </p>
            </InfoButton>
            <InfoButton label="If a problem can't be fixed">
              <p>
                After 2 rounds the last version goes on to step 3 along with the problems that are left. The document says
                plainly that those are unresolved. It does not present them as solved.
              </p>
            </InfoButton>
            <InfoButton label="If it needs no maths">
              <p>
                For a question, a note or a heading, step 2 returns an empty list and step 3 answers or adds the blocks. That
                costs one extra short call.
              </p>
            </InfoButton>
            <InfoButton label="Step 2: what each equation is sent with">
              <p>
                Each equation the model submits has four fields: the equation itself (<b>raw</b>), a <b>role</b> (given,
                choice, calculation, check or output), a short reason (<b>why</b>), and a yes/no <b>positive</b> flag for
                results that must be above zero.
              </p>
              <p className="mt-3">
                The role is shown to step 3 beside each equation. The reason is what step 3 turns into the explanation. The
                model can also search your other documents during this step.
              </p>
            </InfoButton>
            <InfoButton label="Step 2: what the server checks after every attempt">
              <p>
                After each attempt the server solves the equations and builds a list of problems. That list is sent back to
                the model, and the attempt is repeated until the list is empty or the 2 rounds are used. A problem is added
                when:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>an entry has no &ldquo;=&rdquo; in it. It is skipped.</li>
                <li>an equation has no reason.</li>
                <li>the solver reports an error for an equation.</li>
                <li>a step with the role <b>check</b> gives anything other than 1 or 0.</li>
                <li>a check gives 0. The model is told not to weaken it, and the prompt tells it to change the design if the
                  problem asks for a design. If the problem is an analysis it keeps the result and step 3 says the check fails.</li>
                <li>a step marked <b>positive</b> gives a result that is zero or negative.</li>
              </ul>
              <p className="mt-3">
                A failed check is handled by the same retry as an error. There is no separate loop. At most 120 equations are
                read.
              </p>
            </InfoButton>
            <InfoButton label="If an attempt is cut off">
              <p>
                If a call runs out of room (16,000 tokens) it is thrown away, the model is told to use fewer words, and it
                tries again. This counts as one of the rounds. If the model replies without calling the tool, it is told once
                to call it.
              </p>
            </InfoButton>
            <InfoButton label="Step 3: what the server checks and what happens if it fails">
              <p>
                The written blocks must include every solved equation once, in order, and some text, and are limited to 300
                blocks. If something is wrong the model is told and tries again, up to 2 calls in all.
              </p>
              <p className="mt-3">
                If it never produces a valid document, the server adds each solved equation with its reason as plain text
                and tells you it could not write the full explanation.
              </p>
            </InfoButton>
          </div>
        </Section>

        {/* 3. What the model sees */}
        <Section
          title="What the model is sent"
          intro="Everything below goes with every message. Nothing carries over except what is in the chat."
        >
          <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
            {[
              ["System prompt", "April's instructions and an overview of the platform, then the reference for the document page (blocks, solver, units, functions, constants, CAD and dataset links), the modes, and how to propose changes."],
              ["Tools", "The list of things it may do, from the mode. Each has a description the model reads."],
              ["Page address and a note", "Which page you are on, and that \"this\" or \"it\" means the document as a whole. In Inspect mode with a block selected, it means the selected block instead."],
              ["The mode note (Overview only)", "A line saying the mode is Overview, that the model cannot change the document, and what to say if you ask for a change."],
              ["The selected block (Inspect only)", "A note with the id, type, name and content of the block you have selected, so the model can name it when it edits it. Not sent in Overview or Build."],
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
            If a change can&apos;t be applied, the chat shows it as failed and says why. The reasons are: the block it names
            no longer exists, it names a block of a different kind, or (in Inspect mode) it is an edit to a block other than
            the selected one. The model finds out whether its equations solved from the document text it is sent with
            your next message.
          </p>
        </Section>

        {/* 6. Limits */}
        <Section title="Limits">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>The chat is limited to one allow-listed user for now.</li>
            <li>It cannot add or change plots, images, video, sliders, dropdowns, select blocks, loops or cards.</li>
            <li>In Inspect mode, an edit is only applied to the block that was selected when you sent the message, and only by a tool of the block&apos;s own kind. Adding new blocks is not limited to the selected block.</li>
            <li>In Inspect mode it cannot check an equation solves until the equation is in the document, so it only learns the result on your next message. Build mode checks first.</li>
            <li>In Build mode, new equations are solved after the equations already in the document. Variables that come from sliders, datasets, loops or CAD links are not passed to the server, so an equation using one will report it as undefined.</li>
            <li>Build mode adds blocks. It does not edit existing ones, because it has no way to know a block&apos;s id.</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}
