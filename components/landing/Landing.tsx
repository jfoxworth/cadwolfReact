import Nav from "./Nav";
import Hero from "./Hero";
import IntroVideos from "./IntroVideos";
import ProblemSolution from "./ProblemSolution";
import OverviewPanels from "./OverviewPanels";
import CadBreak from "./CadBreak";
import ReplaceThem from "./ReplaceThem";
import ComparisonTable from "./ComparisonTable";
import StartNow from "./StartNow";
import Community from "./Community";
import TutorialBreak from "./TutorialBreak";
import Demos from "./Demos";
import Footer from "./Footer";

export default function Landing() {
  return (
    <div className="flex flex-col min-h-screen font-sans">
      <Nav />
      <Hero />
      <IntroVideos />
      <ProblemSolution />
      <OverviewPanels />
      <CadBreak />
      <ReplaceThem />
      <ComparisonTable />
      <StartNow />
      <Community />
      <TutorialBreak />
      <Demos />
      <a
        href="/register"
        className="block bg-blue-700 hover:bg-blue-600 transition-colors py-6 text-white text-center"
      >
        <div className="container mx-auto px-6 flex items-center justify-center gap-3 text-lg">
          CADWOLF licenses are free to learn or for students
          <span className="font-bold text-xl">Start Now →</span>
        </div>
      </a>
      <Footer />
    </div>
  );
}
