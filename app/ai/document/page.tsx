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

const prompt = (file: string) => readFileSync(join(process.cwd(), "prompts", file), "utf-8");

const ALL_TOOLS = "equation_block, symbolic_equation_block, text_block, header_block, if_else_block, search_documents";
const ALSO_SENT =
  "your latest message, with the page address, a note that \"this\" means the whole document, the document as text and any images added to the front of it; and the earlier messages in the chat.";

const SYSTEM_PROMPT_VIEW: PromptView = {
  agent: "April, the document assistant",
  call: "System prompt, sent with every message",
  tool: `${ALL_TOOLS} (in Overview mode, only search_documents)`,
  alsoSent: ALSO_SENT,
  prompt: `${prompt("_shared.md")}\n\n${prompt("document.md")}`,
};

const TOOLS_VIEW: PromptView = {
  agent: "April, the document assistant",
  call: "Tool definitions: what the model is told it can do",
  tool: `${ALL_TOOLS} (in Overview mode, only search_documents)`,
  alsoSent: ALSO_SENT,
  prompt:
    "In Inspect and Build mode the model is given all of these. In Overview mode it is given only search_documents.\n\n" +
    JSON.stringify([...CHAT_TOOLS, SEARCH_TOOL], null, 2),
};

export default function DocumentAiPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">How the AI works in a document</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          On a document page, the chat panel talks to an assistant called April. It reads the document as you see it, can
          answer questions about it, and can add or change blocks. Its changes appear in the document straight away, and you
          can undo them.
        </p>

        {/* 1. One message */}
        <Section
          title="One message, start to finish"
          intro="Each message you send is one trip through these steps. The model has no memory of its own between messages. Everything it knows comes from what is sent with the message."
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
          intro="The mode decides which tools the model is given. You switch modes in the chat panel."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Card title="Overview" tone="violet">
              Talk only, about the document as a whole. The model is given only the search tool, so it cannot change the
              document. The browser also refuses to apply any change while you are in Overview.
            </Card>
            <Card title="Inspect" tone="violet">
              One block is selected. The model is given the block tools and is told to change only the selected block. That
              limit is in the prompt only. The tools are the same as in Build.
            </Card>
            <Card title="Build" tone="violet">
              The block tools, anywhere in the document: add new blocks, or change existing ones.
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
              ["Your message and the earlier ones", "The chat so far, as text."],
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
          intro="Five tools change the document. To change an existing block the tool names the block. To add one, it names a block to put the new one before or after."
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
            <li>It cannot check an equation solves until the equation is in the document, so it only learns the result on your next message.</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}
