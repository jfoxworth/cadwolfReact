"use client";

import { useState } from "react";

export default function IntroVideos() {
  const [active, setActive] = useState<"intro" | "basics">("intro");

  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Intro Videos</h2>
          <p className="text-gray-500">
            Watch the 90 second intro video and the 10 minute video on the basics
          </p>
        </div>

        <div className="flex border-b border-gray-200 mb-8 justify-center">
          <button
            onClick={() => setActive("intro")}
            className={`px-8 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active === "intro"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Intro — 90 sec
          </button>
          <button
            onClick={() => setActive("basics")}
            className={`px-8 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active === "basics"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            The Basics — 7 min
          </button>
        </div>

        <div className="flex justify-center">
          {active === "intro" ? (
            <iframe
              width="560"
              height="315"
              src="https://www.youtube.com/embed/XM0PXCzjhlI"
              allowFullScreen
              className="rounded-lg shadow-lg w-full max-w-2xl aspect-video"
            />
          ) : (
            <iframe
              width="560"
              height="315"
              src="https://www.youtube.com/embed/zM3_UM6OaGs"
              allowFullScreen
              className="rounded-lg shadow-lg w-full max-w-2xl aspect-video"
            />
          )}
        </div>
      </div>
    </section>
  );
}
