export default function TutorialBreak() {
  return (
    <section className="bg-gray-800 py-16 text-white text-center">
      <div className="container mx-auto px-6">
        <h3 className="text-3xl font-bold mb-3">Start with our tutorials</h3>
        <p className="text-gray-300 text-lg mb-8">
          Our video tutorials explain what CADWOLF is and how it works, and how to create
          and edit documents.
          <br />
          This is where a new user should start learning.
        </p>
        <a
          href="/tutorials"
          className="inline-block border-2 border-white text-white font-bold px-10 py-4 rounded-full text-lg hover:bg-white hover:text-gray-800 transition-colors"
        >
          Go to Tutorials
        </a>
      </div>
    </section>
  );
}
