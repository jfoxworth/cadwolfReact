import Image from "next/image";
import Nav from "@/components/landing/Nav";
import Footer from "@/components/landing/Footer";

const stats = [
  { value: "45K+", label: "Lines of Code" },
  { value: "5+", label: "Programming Languages" },
  { value: "10+", label: "Software Packages" },
  { value: "1000+", label: "Sleepless Nights" },
];

const skills = [
  { label: "Structural Engineering", pct: 90 },
  { label: "Javascript", pct: 90 },
  { label: "PHP", pct: 80 },
  { label: "Angular", pct: 80 },
  { label: "Laravel", pct: 80 },
  { label: "Bootstrap / Google Material", pct: 80 },
  { label: "Git / Gulp", pct: 70 },
];

const quotes = [
  "My goal is to create a platform where engineers can design entire aircraft or spacecraft from a single unified interface — every beam, joint, and calculation connected and version-controlled.",
  "We move at the speed of software. What would take a traditional engineering firm months we can prototype, test, and ship in days. That pace changes everything.",
  "CADWOLF is as much about democratizing engineering as it is about the tools themselves. A single engineer with a good idea should be able to compete with a Fortune 500 team.",
];

export default function AboutPage() {
  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="relative bg-gray-900 text-white pt-32 pb-20 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 opacity-90" />
        <div className="relative container mx-auto px-6">
          <h1 className="text-5xl font-bold tracking-tight mb-4">About CADWOLF</h1>
          <p className="text-gray-400 text-lg">
            Engineering software built by engineers, for engineers.
          </p>
        </div>
      </section>

      {/* Mission / What we do / How we work */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-6 max-w-5xl grid md:grid-cols-3 gap-10">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Our Mission</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              The goal of CADWOLF is to fundamentally change the way engineers work. It can have the
              same effect on engineering as git has had on programming. To this end, we want to help
              small companies and individual engineers do as much as large companies.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚙️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">What We Do</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              At CADWOLF, we are both programmers and traditional engineers. We do the math to design
              structural components as well as the programming to bring that math to the customers.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">How We Work</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              While we have a vision of a revolutionary new platform, we love feedback and will adjust
              to any good ideas or directions. We can write and push code in a matter of hours or days
              and that code is available by simply refreshing your web page.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-blue-600 py-16 text-white">
        <div className="container mx-auto px-6 max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p className="text-4xl font-bold mb-1">{value}</p>
              <p className="text-blue-100 text-sm uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Founder */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Meet the Founder</h2>
          <div className="flex flex-col md:flex-row gap-12 items-start">
            <div className="flex-shrink-0 flex flex-col items-center gap-4">
              <Image
                src="/mypic.png"
                alt="Joshua Foxworth"
                width={180}
                height={180}
                className="rounded-full object-cover"
              />
              <div className="text-center">
                <p className="font-semibold text-gray-900 text-lg">Joshua Foxworth</p>
                <p className="text-gray-500 text-sm">CEO & Founder</p>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-gray-600 leading-relaxed mb-6">
                Joshua holds a BS and MS in Aerospace Engineering from the University of Texas at
                Austin and has worked on programs including the Orion capsule. He has spent his career
                at the intersection of structural analysis and software — building tools that make
                rigorous engineering accessible and collaborative.
              </p>
              <div className="flex flex-col gap-3">
                {skills.map(({ label, pct }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{label}</span>
                      <span className="text-gray-400">{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision quotes */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">The Vision</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {quotes.map((q, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
                <Image
                  src="/BlackHead.png"
                  alt="Joshua Foxworth"
                  width={48}
                  height={48}
                  className="rounded-full"
                />
                <p className="text-gray-600 text-sm leading-relaxed italic">&ldquo;{q}&rdquo;</p>
                <p className="text-gray-900 font-medium text-sm">Joshua Foxworth</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
