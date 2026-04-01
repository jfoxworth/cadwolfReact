import Image from "next/image";

export default function Nav() {
  return (
    <header className="fixed top-0 w-full z-50 bg-gray-900/90 backdrop-blur-sm">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/">
          <Image src="/logobigwhite.png" alt="CADWOLF" width={140} height={60} />
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-300">
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#community" className="hover:text-white transition-colors">Community</a>
          <a href="#demos" className="hover:text-white transition-colors">Demos</a>
          <a href="/accounts" className="hover:text-white transition-colors">Pricing</a>
          <a href="/login" className="hover:text-white transition-colors">Log In</a>
          <a
            href="/register"
            className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-500 transition-colors"
          >
            Create Account
          </a>
        </nav>
      </div>
    </header>
  );
}
