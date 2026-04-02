"use client";

import { useState } from "react";
import Nav from "@/components/landing/Nav";
import Footer from "@/components/landing/Footer";
import {
  Monitor,
  FileText,
  Folder,
  Database,
  GitBranch,
  Calendar,
  ArrowLeftRight,
  Eye,
  BarChart2,
  Box,
  Atom,
  Calculator,
  Settings,
  Repeat,
  File,
  Users,
  Sliders,
  Upload,
  Download,
} from "lucide-react";

// ── Tab nav data ───────────────────────────────────────────────────────────

const NAV_TABS = [
  { id: "overview", label: "Five Main Components", Icon: Monitor },
  { id: "documents", label: "Documents — the backbone", Icon: FileText },
  { id: "workspaces", label: "Workspaces — like folders", Icon: Folder },
  { id: "datasets", label: "Datasets — import data", Icon: Database },
  { id: "parttrees", label: "Part Trees — build something", Icon: GitBranch },
  {
    id: "cad",
    label: "Link to CAD — Fusion 360 & Onshape",
    Icon: ArrowLeftRight,
  },
] as const;

type TabId = (typeof NAV_TABS)[number]["id"];

// ── Document feature boxes ─────────────────────────────────────────────────

const FEATURES = [
  {
    Icon: Eye,
    title: "Unit Tracking",
    desc: "Equations in documents track units like meters, seconds, etc, and solve accordingly",
  },
  {
    Icon: BarChart2,
    title: "Full Charting Suite",
    desc: "Line, spline, bar, column, heat maps, and several other charts available",
  },
  {
    Icon: Box,
    title: "3D Charts",
    desc: "3D point clouds, surface maps, and line charts are also available",
  },
  {
    Icon: Atom,
    title: "Built‑in Functions",
    desc: "Wide range of built‑in functions like trig, statistical tools, an FFT, and an ODE solver",
  },
  {
    Icon: Calculator,
    title: "Mathematically Proper Display",
    desc: "When an equation solves, it shows in the proper mathematical format with integration symbols, etc",
  },
  {
    Icon: Settings,
    title: "Permission Structure",
    desc: "Documents can be set so that users can read, use, or edit them",
  },
  {
    Icon: Repeat,
    title: "Programming Structures",
    desc: "Add for loops, while loops, and if/else statements alongside equations",
  },
  {
    Icon: File,
    title: "Files as Functions",
    desc: "Documents can be pulled into other documents and used as functions",
  },
  {
    Icon: Users,
    title: "Teams",
    desc: "Create teams, add users to them, and then give permissions to those teams",
  },
  {
    Icon: Sliders,
    title: "Interactive Controls",
    desc: "Use sliders, select boxes, and radio boxes as variables in CadWolf documents",
  },
  {
    Icon: Upload,
    title: "Export Data to CAD",
    desc: "Push data to Onshape documents to drive component design",
  },
  {
    Icon: Download,
    title: "Import Data from CAD",
    desc: "Pull in data such as mass and volume from Onshape documents to be used in CadWolf documents",
  },
];

// ── CAD steps ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: 1,
    title: "Design in CadWolf",
    body: [
      "CadWolf documents are spaces for users to solve and document the mathematics of designing components. In the document pictured here, the height and thickness of the vertical risers in the fitting are designed based upon the design load and tensile strength of the material. The diameter of the bolt is also established.",
      "When a requirement or design factor such as the load changes, the math automatically updates. These CadWolf equations are then automatically sent from this document to an Onshape document or Fusion 360 file.",
    ],
    img: "https://cadwolf.s3.us-west-2.amazonaws.com/stock/steps1.png",
    alt: "Math in CadWolf",
  },
  {
    num: 2,
    title: "Math drives Fusion 360 / Onshape",
    body: [
      "When the CadWolf document is saved, those equations are sent to the CAD system where they are stored as variables. When the fitting is designed in CAD, those variables are used to set the same factors — height and thickness of the risers and the diameter of the bolt hole.",
      "This means that when the math changes in CadWolf, the CAD updates automatically. A properly designed CAD model updates autonomously in response to the changing math.",
    ],
    img: "https://cadwolf.s3.us-west-2.amazonaws.com/stock/steps2.png",
    alt: "CAD driven by CadWolf",
  },
  {
    num: 3,
    title: "CAD feeds into CadWolf",
    body: [
      "The Fusion 360 or Onshape files can be read back into CadWolf documents and items such as weight, mass, volume, or density of the CAD model can be used in subsequent mathematics. Those items can also be displayed for parts and assemblies in part trees.",
      "This lets engineers see the mass, weight, volume, and other items for entire assemblies in real time as they are designed in CadWolf.",
    ],
    img: "https://cadwolf.s3.us-west-2.amazonaws.com/stock/steps3.png",
    alt: "CAD data in CadWolf",
  },
];

// ── Tab content ────────────────────────────────────────────────────────────

function TabContent({ tab }: { tab: TabId }) {
  const bullet =
    "before:content-['›'] before:mr-2 before:text-blue-500 before:font-bold";

  if (tab === "overview")
    return (
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">
          Five Components
        </h3>
        <p className="text-sm text-blue-600 mb-4">
          Our components link the design and coordination of large structures
          directly to CAD models
        </p>
        <p className="text-gray-600 mb-3">
          CadWolf has five main types of web pages — Documents, Workspaces,
          Datasets, and Part Trees. These components work in concert to provide
          a platform that encompasses all facets of the engineering process.
        </p>
        <p className="text-gray-600">
          Documents are where users create web pages that have text, equations,
          plots, and many other things. Workspaces act as folders. Datasets
          provide a method for users to import data, and part trees link
          everything together for a new level of functionality.
        </p>
      </div>
    );

  if (tab === "documents")
    return (
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">
          Documents — the backbone of CadWolf
        </h3>
        <p className="text-sm text-blue-600 mb-4">
          Web pages that look like Word documents and behave like a program
        </p>
        <p className="text-gray-600 mb-3">
          Documents are web pages formatted to look and function much like a
          Word document, while also having the ability to add and solve
          equations in real time. Equations solve top to bottom, like a
          programming language, and can be used in plots.
        </p>
        <p className="text-gray-600 mb-4">
          Geared for engineers, documents solve for units in equations, require
          no programming, and format equations to be mathematically appropriate.
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            ["Text", "Headers", "Equations", "Symbolic Equations", "Tables"],
            [
              "For Loops",
              "While Loops",
              "If/Else Statements",
              "Sliders",
              "Radio Buttons",
            ],
            ["Select Boxes", "2D Charts", "3D Charts", "Images", "Videos"],
          ].map((col, i) => (
            <ul key={i} className="space-y-1.5 text-sm text-gray-600">
              {col.map((item) => (
                <li key={item} className={bullet}>
                  {item}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    );

  if (tab === "workspaces")
    return (
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">
          Workspaces — our version of folders
        </h3>
        <p className="text-sm text-blue-600 mb-4">
          Web pages that look and behave like standard folders
        </p>
        <p className="text-gray-600 mb-3">
          With any platform, there is a need to organize files and data.
          Workspaces are web pages formatted to look like standard folders. This
          is where users add new documents, datasets, images, and other items,
          and where those items are accessed.
        </p>
        <p className="text-gray-600">
          Every user has a base workspace at{" "}
          <span className="font-mono text-sm bg-gray-100 px-1 rounded">
            /workspace/userName
          </span>
          . Each user can also assign permissions for other users to view and
          edit their documents and folders.
        </p>
      </div>
    );

  if (tab === "datasets")
    return (
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">
          Datasets — bring in the data
        </h3>
        <p className="text-sm text-blue-600 mb-4">
          Bring in text files, parse them, and use the data
        </p>
        <p className="text-gray-600 mb-3">
          A dataset is a type of page in CadWolf that lets users paste in text
          or read in a file. It then parses the text into an n-dimensional
          matrix and stores that data. The user can then import that data into
          any document and use it as a variable.
        </p>
        <p className="text-gray-600">
          Whenever the dataset is updated, any linked document will change as
          well. This lets users import test data or any other type of data
          without maintaining files outside of CadWolf.
        </p>
      </div>
    );

  if (tab === "parttrees")
    return (
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">
          Part Trees — a new standard in engineering
        </h3>
        <p className="text-sm text-blue-600 mb-4">
          Part Trees use documents and folders to build complete systems
        </p>
        <p className="text-gray-600">
          Whenever a large structure is designed, individual components are
          given part numbers that uniquely identify and organize the structure.
          Part trees let users set up a part numbering scheme and build a
          structure piece by piece. Each component gets a document where the
          item is designed. These items can be linked directly to CAD and
          properties like weight and mass can be viewed in real time.
        </p>
      </div>
    );

  if (tab === "cad")
    return (
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">
          Direct link to CAD — Fusion 360 and Onshape
        </h3>
        <p className="text-sm text-blue-600 mb-4">
          Feed math directly into CAD and read CAD data into files
        </p>
        <p className="text-gray-600 mb-3">
          In a typical engineering process, CAD and design math are separate. In
          CadWolf, users can directly link mathematics to variables in Onshape
          and User Parameters in Fusion 360. Using those variables to define the
          CAD links everything together.
        </p>
        <p className="text-gray-600">
          Whenever a requirement changes, those changes propagate through
          CadWolf letting the system redesign itself. Those changes are then
          pushed to Onshape / Fusion 360 and the CAD updates accordingly.
        </p>
      </div>
    );

  return null;
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ModulesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [activeStep, setActiveStep] = useState(0);

  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="pt-32 pb-12 bg-gray-900 text-white text-center">
        <div className="container mx-auto px-6 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            CadWolf Modules
          </h1>
          <p className="text-gray-300 text-lg">
            Five components that work together to provide a complete STEM
            solution and management platform.
          </p>
        </div>
      </section>

      {/* Section 1: Five Components tab nav */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              CadWolf's Five Components
            </h2>
            <p className="text-gray-500">
              CadWolf uses five components to provide a complete STEM solution
              and management platform
            </p>
          </div>

          <div className="flex gap-8">
            {/* Left nav */}
            <ul className="w-64 flex-shrink-0 space-y-1">
              {NAV_TABS.map(({ id, label, Icon }) => (
                <li key={id}>
                  <button
                    onClick={() => setActiveTab(id)}
                    className={[
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-left transition",
                      activeTab === id
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:bg-gray-100",
                    ].join(" ")}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    <span className="text-xs opacity-60">›</span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Right content */}
            <div className="flex-1 bg-gray-50 rounded-2xl p-8">
              <TabContent tab={activeTab} />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Document Features */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Document Features
            </h2>
            <p className="text-gray-500">
              CadWolf documents have a wide array of features
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Icon size={18} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Module Features — 3 columns */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Module Features
            </h2>
            <p className="text-gray-500">
              How the CadWolf modules integrate to form a complete system
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                title: "Simultaneous Analysis and Documentation",
                items: [
                  "Documents have text, equations, charts, etc",
                  "Functions as both a Word document and program",
                  "Analysis and documentation can never get out of sync",
                  "Line by line mathematics similar to Excel",
                ],
              },
              {
                title: "Integrated Mathematics and CAD",
                items: [
                  "Link to the Onshape and Fusion 360 platforms",
                  "CadWolf equations drive CAD dimensions",
                  "Weight, mass, etc read from CAD into documents",
                  "Embed thumbnails of CAD parts into documents",
                ],
              },
              {
                title: "Coordinate Engineering Tasks",
                items: [
                  "Part trees coordinate the design of large structures",
                  "Permissions system lets users view / use items",
                  "Datasets provide for the storage and use of data",
                  "Ensures identical work environments — web browsers",
                ],
              },
            ].map(({ title, items }) => (
              <div key={title}>
                <h4 className="font-bold text-gray-900 mb-3 pb-2 border-b-2 border-blue-600">
                  {title}
                </h4>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <span className="text-blue-500 font-bold mt-0.5">›</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: CAD Relationship — 3-step tabs */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">
              CadWolf's Relation to CAD
            </h2>
          </div>

          {/* Step selector */}
          <div className="flex justify-center gap-0 mb-10 relative">
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gray-300 -z-10" />
            {STEPS.map((step, i) => (
              <button
                key={step.num}
                onClick={() => setActiveStep(i)}
                className="flex flex-col items-center gap-2 px-10 group"
              >
                <div
                  className={[
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition",
                    activeStep === i
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-500 border-gray-300 group-hover:border-blue-400",
                  ].join(" ")}
                >
                  {step.num}
                </div>
                <span
                  className={`text-xs font-medium text-center max-w-[120px] ${activeStep === i ? "text-blue-600" : "text-gray-500"}`}
                >
                  {step.title}
                </span>
              </button>
            ))}
          </div>

          {/* Step content */}
          <div className="bg-white rounded-2xl p-8 grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              {STEPS[activeStep].body.map((para, i) => (
                <p key={i} className="text-gray-600 leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={STEPS[activeStep].img}
                alt={STEPS[activeStep].alt}
                className="rounded-xl shadow w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-700 py-16 text-white text-center">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-3">Ready to get started?</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            Create your free account in under a minute. No credit card required.
          </p>
          <a
            href="/register"
            className="inline-block bg-white text-blue-700 font-bold px-10 py-4 rounded-full text-lg hover:bg-blue-50 transition-colors"
          >
            Create Free Account
          </a>
        </div>
      </section>

      <Footer />
    </>
  );
}
