"use client";

import { useState } from "react";
import Image from "next/image";
import Nav from "@/components/landing/Nav";
import Footer from "@/components/landing/Footer";

type Category = "All" | "Overview" | "Documents" | "Workspaces" | "Datasets" | "Part Trees";

interface Tutorial {
  title: string;
  category: Exclude<Category, "All">;
  youtubeId: string;
  date: string;
  summary: string;
}

const tutorials: Tutorial[] = [
  {
    title: "Introduction",
    category: "Overview",
    youtubeId: "XrMM7sw7BVg",
    date: "July 2017",
    summary:
      "Brief introduction to the platform — documents, Onshape linking, and part trees.",
  },
  {
    title: "The Basics",
    category: "Overview",
    youtubeId: "MkdSZhrsxrU",
    date: "October 2015",
    summary:
      "Overview of documents, workspaces, datasets, and part trees. Note: somewhat outdated.",
  },
  {
    title: "Intro to Documents",
    category: "Documents",
    youtubeId: "XqW_UBgsIAs",
    date: "October 2015",
    summary: "Creating and editing documents. Note: some features are out of date.",
  },
  {
    title: "Intro to Workspaces",
    category: "Workspaces",
    youtubeId: "J-WHvnTT1_A",
    date: "October 2015",
    summary:
      "The concept of workspaces as folders for creating and storing items. Note: out of date.",
  },
  {
    title: "The Drake Equation",
    category: "Documents",
    youtubeId: "cuOQfDmu5rU",
    date: "October 2015",
    summary:
      "A simple document example walking through the Drake equation with explanatory text.",
  },
  {
    title: "The Quadratic Equation",
    category: "Documents",
    youtubeId: "1054ptk3Db8",
    date: "October 2015",
    summary:
      "Solving quadratic roots — shows adding and editing items and equations.",
  },
  {
    title: "Text in Documents",
    category: "Documents",
    youtubeId: "p2cCcj7N6Rc",
    date: "October 2015",
    summary: "Introduction to using text blocks in documents.",
  },
  {
    title: "Headers in Documents",
    category: "Documents",
    youtubeId: "EJPZl9ggHUE",
    date: "October 2015",
    summary: "Introduction to using headers in documents.",
  },
  {
    title: "Equations in Documents",
    category: "Documents",
    youtubeId: "zUItUp57UT0",
    date: "October 2015",
    summary: "Using equations in documents with multiple use cases demonstrated.",
  },
  {
    title: "Symbolic Equations",
    category: "Documents",
    youtubeId: "pf5P-_VMiqo",
    date: "October 2015",
    summary: "Introduction to symbolic equations and how they interact with numeric blocks.",
  },
  {
    title: "Images in Documents",
    category: "Documents",
    youtubeId: "dRbqDTr_yGw",
    date: "November 2015",
    summary: "How to upload and use images inside documents.",
  },
  {
    title: "Videos in Documents",
    category: "Documents",
    youtubeId: "QvWqVTrg5lg",
    date: "November 2015",
    summary: "Using YouTube video links inside cadwolf documents.",
  },
];

const CATEGORIES: Category[] = ["All", "Overview", "Documents", "Workspaces", "Datasets", "Part Trees"];

export default function TutorialsPage() {
  const [active, setActive] = useState<Category>("All");

  const filtered = active === "All" ? tutorials : tutorials.filter((t) => t.category === active);

  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="bg-gray-900 text-white pt-32 pb-16 text-center">
        <div className="container mx-auto px-6">
          <h1 className="text-5xl font-bold tracking-tight mb-3">Tutorials</h1>
          <p className="text-gray-400 text-lg">Video tutorials for CADWOLF — more coming soon.</p>
          <nav className="text-gray-500 text-sm mt-4">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <span className="mx-2">/</span>
            <span className="text-gray-300">Tutorials</span>
          </nav>
        </div>
      </section>

      {/* Filter tabs */}
      <section className="bg-white border-b sticky top-16 z-40">
        <div className="container mx-auto px-6 flex gap-1 overflow-x-auto py-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                active === cat
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-6 max-w-6xl grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((t) => (
            <a
              key={t.youtubeId}
              href={`https://www.youtube.com/watch?v=${t.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden bg-gray-200">
                <Image
                  src={`https://img.youtube.com/vi/${t.youtubeId}/hqdefault.jpg`}
                  alt={t.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                  <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              {/* Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                    {t.category}
                  </span>
                  <span className="text-xs text-gray-400">{t.date}</span>
                </div>
                <h3 className="text-gray-900 font-semibold mb-1 group-hover:text-blue-600 transition-colors">
                  {t.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{t.summary}</p>
              </div>
            </a>
          ))}

          {filtered.length === 0 && (
            <p className="col-span-3 text-center text-gray-400 py-16">
              No tutorials in this category yet.
            </p>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}
