export default function ProblemSolution() {
  return (
    <section className="bg-gray-100 py-16">
      <div className="container mx-auto px-6 max-w-5xl grid md:grid-cols-2 gap-12">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-gray-900 mb-4">The Problems</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            General-purpose AI gets engineering math wrong and cannot show its work.
            Meanwhile mathematics, documentation, and CAD drift out of sync, and small
            changes force redesigns across large structures
          </p>
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-gray-900 mb-4">
            ENGENTIC: The Solution
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            The ENGENTIC assistant writes the calculation, and a deterministic unit-aware
            solver does the arithmetic. Everything stays in one platform and syncs with
            CAD, so changes flow through the whole project and every number is verifiable
          </p>
        </div>
      </div>
    </section>
  );
}
