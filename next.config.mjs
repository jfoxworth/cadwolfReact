/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  experimental: {
    // Self-hosted (Heroku) sits behind a reverse proxy that terminates TLS and forwards to a
    // dynamic internal port. Without this, Next.js builds every request's URL (req.nextUrl, used
    // by the OAuth routes under app/api/auth/*) from its own bind hostname/port instead of the
    // real Host header the proxy forwarded — e.g. "https://localhost:45498" instead of
    // "https://www.engentic.tech" — which breaks any flow that needs the actual public origin.
    trustHostHeader: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },
};

export default nextConfig;
