export default function StartNow() {
  return (
    <section className="bg-blue-700 py-16 text-white text-center">
      <div className="container mx-auto px-6">
        <h3 className="text-3xl font-bold mb-3">Try it now for free</h3>
        <p className="text-blue-100 text-lg mb-8">
          CADWOLF licences are free for students and for those learning the platform.
          <br />
          Start today with your own work or by jumping into group projects.
        </p>
        <a
          href="/register"
          className="inline-block bg-white text-blue-700 font-bold px-10 py-4 rounded-full text-lg hover:bg-blue-50 transition-colors"
        >
          Create Account
        </a>
      </div>
    </section>
  );
}
