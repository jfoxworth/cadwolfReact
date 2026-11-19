import Nav from "@/components/landing/Nav";
import Footer from "@/components/landing/Footer";

export const metadata = { title: "Privacy Policy – Engentic" };

// PLACEHOLDER: replace the text below with the real Privacy Policy before launch.
export default function Page() {
  return (
    <>
      <Nav />
      <main className="bg-white pt-32 pb-20">
        <div className="container mx-auto px-6 max-w-3xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Placeholder text. Replace before launch.</p>
          <p className="text-gray-600 leading-relaxed">
            The Privacy Policy for Engentic has not been written yet.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
