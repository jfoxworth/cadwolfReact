// Research agent: fetches one reference link and returns only what the user's note asked for,
// with its source. Process step 5. Fetched content is data, never instructions, and fetching
// must not be able to reach internal addresses.
// Prompt will live in prompts/agents/research-agent.md.
import { notBuilt } from "./notBuilt";

export const researchAgent = notBuilt("research-agent");
