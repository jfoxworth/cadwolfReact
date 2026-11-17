import Nav from "./Nav";
import Hero from "./Hero";
import WhatIsEngentic from "./WhatIsEngentic";
import DocumentTour from "./DocumentTour";
import WorkspaceTour from "./WorkspaceTour";
import TextToSpaceship from "./TextToSpaceship";
import PartTreeBuildTour from "./PartTreeBuildTour";
import EngenticAI from "./EngenticAI";
import BuildTour from "./BuildTour";
import CadBreak from "./CadBreak";
import StartNow from "./StartNow";
import Community from "./Community";
import Footer from "./Footer";

export default function Landing() {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-white">
      <Nav />
      <Hero />
      <WhatIsEngentic />
      <DocumentTour />
      <Community />
      <WorkspaceTour />
      <EngenticAI/>
      <BuildTour />
      <TextToSpaceship />
      <PartTreeBuildTour />
      <CadBreak />
      <StartNow />
      <a
        href="/register"
        className="block bg-blue-700 hover:bg-blue-600 transition-colors py-6 text-white text-center"
      >
        <div className="container mx-auto px-6 flex items-center justify-center gap-3 text-lg">
          ENGENTIC licenses are free to learn or for students
          <span className="font-bold text-xl">Start Now →</span>
        </div>
      </a>
      <Footer />
    </div>
  );
}
