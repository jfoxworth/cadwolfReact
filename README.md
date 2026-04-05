# CadWolf

CadWolf is a web-based engineering calculation platform that lets engineers write, solve, and share structured calculation documents. Calculations are organized into workspaces containing documents made up of blocks — equations, sliders, datasets, plots, loops, and more — that solve in sequence with full unit awareness and symbolic math support. Documents can be linked to CAD assemblies (Onshape, Autodesk Fusion) so that parameter changes in the model flow directly into the calculation.

---

## Technology

- **Framework**: [Next.js 15](https://nextjs.org) (App Router, React Server Components)
- **Language**: TypeScript
- **Database**: PostgreSQL via [Prisma](https://www.prisma.io)
- **Auth**: Custom session-based auth with iron-session; OAuth for Google, Facebook, Onshape, and Fusion 360
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Math rendering**: [KaTeX](https://katex.org)
- **Solver**: Custom Web Worker-based equation solver with unit propagation (runs entirely in the browser)
- **Package manager**: [pnpm](https://pnpm.io)

---

## Running Locally

**Prerequisites**: Node.js 20+, pnpm, a running PostgreSQL instance.

1. **Clone the repo and install dependencies**
   ```bash
   git clone <repo-url>
   cd cadwolf
   pnpm install
   ```

2. **Set up environment variables**

   Copy the example env file and fill in your values:
   ```bash
   cp .env.example .env.local
   ```

   Required variables:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/cadwolf
   SESSION_SECRET=<a long random string>
   ```

   Optional (for OAuth / CAD integrations):
   ```
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   FACEBOOK_CLIENT_ID=
   FACEBOOK_CLIENT_SECRET=
   ONSHAPE_CLIENT_ID=
   ONSHAPE_CLIENT_SECRET=
   FUSION_CLIENT_ID=
   FUSION_CLIENT_SECRET=
   ```

3. **Run database migrations**
   ```bash
   pnpm prisma migrate deploy
   ```

4. **Start the development server**
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## AI Context

The full platform reference used to prompt the CadWolf AI assistant is publicly accessible at:

**[https://cadwolf.com/ai-context](https://cadwolf.com/ai-context)**

This page documents platform structure, all built-in functions, the unit system, constants, CAD integration, and solver behavior. External AI systems can fetch this URL to gain full context about the CadWolf platform.

---

## Additional READMEs (coming soon)

- **Solver** — how the equation solver works, step pipeline, unit system, and Web Worker architecture
- **Document blocks** — reference for all block types (equation, slider, dataset, plot, for loop, while loop, if/else, etc.)
- **CAD integrations** — connecting Onshape and Autodesk Fusion 360 to a document
- **API** — REST endpoints, auth flow, and permission model
- **Deployment** — environment setup, database migrations, and production configuration
