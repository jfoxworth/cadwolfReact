// AI credits: what users have bought, what is left, and what each AI interaction cost.
//
// Amounts are whole "units", one millionth of a dollar. A credit is $0.001, so 1 credit = 1,000
// units. Whole units keep small calls exact (a $0.0003 Haiku call is 300 units). The UI shows credits.
//
// Three tables (prisma/schema.prisma): AiCreditPurchase (what was bought or granted),
// AiCreditBalance (what is left of each purchase, reduced on every use) and AiUsageLog (one row
// per interaction). For any account:
//   sum(purchases.units) - sum(usage.costUnits) = sum(balances.remaining)
// An account is a user's own credits (teamId null) or a team's shared credits (teamId set).
// Usage rows always record the person who made the request (userId) and the pool that paid (teamId).
import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/utils/db";
import { messageCost } from "@/utils/aiPricing";
import type { AiModelKey } from "@/utils/aiModels";
import { resolveFileRoute } from "@/utils/resolveRoute";

export const UNITS_PER_DOLLAR = 1_000_000;
export const CREDITS_PER_DOLLAR = 1000;
export const UNITS_PER_CREDIT = UNITS_PER_DOLLAR / CREDITS_PER_DOLLAR;

/** One-time credit for a user who starts paying: $5. */
export const WELCOME_GRANT_UNITS = 5 * UNITS_PER_DOLLAR;

export type AiPageType = "document" | "dataset" | "workspace" | "part-tree";
export type AiUsageSource = "chat" | "document_build" | "part_tree_build" | "generate_document";

/** Tokens and cost summed over every model call one interaction makes. `input` counts every input
 *  token, cached or not, and `cacheRead`/`cacheWrite` are the parts of it that were. `cost` is the
 *  estimated dollars, worked out per call (cache reads and writes are priced differently from plain
 *  input, and Haiku's rate depends on each call's prompt length), so it is not recomputed from totals. */
export interface UsageTally {
  input: number;
  cacheRead: number;
  cacheWrite: number;
  output: number;
  cost: number;
}

export function newUsageTally(): UsageTally {
  return { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, cost: 0 };
}

/** Adds one finished API message to a tally. */
export function addMessageUsage(tally: UsageTally, model: AiModelKey, message: Pick<Anthropic.Message, "usage">): void {
  const cacheRead = message.usage.cache_read_input_tokens ?? 0;
  const cacheWrite = message.usage.cache_creation_input_tokens ?? 0;
  tally.input += (message.usage.input_tokens ?? 0) + cacheRead + cacheWrite;
  tally.cacheRead += cacheRead;
  tally.cacheWrite += cacheWrite;
  tally.output += message.usage.output_tokens ?? 0;
  tally.cost += messageCost(model, message);
}

const PAGE_TYPES: AiPageType[] = ["document", "dataset", "workspace", "part-tree"];

/** The page type and file id for a page path such as "/document/my-calc" (the first segment is the
 *  type, the rest names the file). The type falls back to "workspace" for any other path, and the
 *  file id is null if the path names no file this user can reach. */
export async function resolvePageFile(
  pagePath: string | undefined,
  userId: number,
): Promise<{ pageType: AiPageType; fileId: number | null }> {
  const segments = (pagePath ?? "").split("/").filter(Boolean).map((seg) => {
    try { return decodeURIComponent(seg); } catch { return seg; }
  });
  const first = segments[0] as AiPageType | undefined;
  const pageType = first && PAGE_TYPES.includes(first) ? first : "workspace";
  if (!first || pageType !== first || segments.length < 2) return { pageType, fileId: null };
  try {
    const file = await resolveFileRoute(pageType, segments.slice(1), userId);
    return { pageType, fileId: file?.id ?? null };
  } catch {
    return { pageType, fileId: null };
  }
}

/** Whose credits pay: a team's shared pool (teamId set) or the user's own (teamId null). `userId` is the
 *  person making the request either way. */
export interface Account {
  userId: number;
  teamId: number | null;
}

/** Prisma filter for the rows belonging to an account's pool. */
function poolWhere(account: Account) {
  return account.teamId !== null ? { teamId: account.teamId } : { userId: account.userId, teamId: null };
}

/** Which account a request is charged to. Uses the team the client asked for (`requestedTeamId`, where
 *  null means personal), otherwise the user's saved choice, otherwise personal. A team is used only if
 *  the user is a member of it, so a stale choice (removed from the team) quietly falls back to personal. */
export async function resolveAccount(userId: number, requestedTeamId?: number | null): Promise<Account> {
  let teamId: number | null;
  if (requestedTeamId !== undefined) {
    teamId = requestedTeamId;
  } else {
    const user = await db.user.findUnique({ where: { id: userId }, select: { aiAccountTeamId: true } });
    teamId = user?.aiAccountTeamId ?? null;
  }
  if (teamId === null || !Number.isInteger(teamId)) return { userId, teamId: null };
  const member = await db.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  return { userId, teamId: member ? teamId : null };
}

/** Reads the optional `teamId` a client sent with a request: a whole number, null for personal, or
 *  undefined when the field was not sent at all. */
export function parseRequestedTeamId(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

export function dollarsToUnits(dollars: number): bigint {
  return BigInt(Math.round(dollars * UNITS_PER_DOLLAR));
}

/** Units as credits, for display. */
export function unitsToCredits(units: bigint | number): number {
  return Number(units) / UNITS_PER_CREDIT;
}

/** An account's balance in units: the sum of what is left of each purchase. Can be negative. */
export async function getBalanceUnits(account: Account): Promise<bigint> {
  const sum = await db.aiCreditBalance.aggregate({ where: poolWhere(account), _sum: { remaining: true } });
  return sum._sum.remaining ?? BigInt(0);
}

/** An account's balance in credits, for display. */
export async function getBalanceCredits(account: Account): Promise<number> {
  return unitsToCredits(await getBalanceUnits(account));
}

/** Start of the current calendar month (UTC), when monthly member caps reset. */
function monthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** What a member has spent from a team's credits this month, in units. */
export async function getMemberMonthUnits(teamId: number, userId: number): Promise<bigint> {
  const sum = await db.aiUsageLog.aggregate({
    where: { teamId, userId, createdAt: { gte: monthStart() } },
    _sum: { costUnits: true },
  });
  return sum._sum.costUnits ?? BigInt(0);
}

export const NO_CREDITS_MESSAGE = "You are out of AI credits. Buy more on the Billing page to continue.";
export const MEMBER_CAP_MESSAGE = "You have reached your monthly limit for this team's AI credits. Ask a team admin to raise it, or switch to your own credits.";

/** Why a request cannot start, or null if it can: the account's balance must be above zero and, for a
 *  team account, the member must be under their monthly cap if one is set. */
export async function spendBlock(account: Account): Promise<{ message: string } | null> {
  if ((await getBalanceUnits(account)) <= BigInt(0)) return { message: NO_CREDITS_MESSAGE };
  if (account.teamId !== null) {
    const limit = await db.teamAiLimit.findUnique({
      where: { teamId_userId: { teamId: account.teamId, userId: account.userId } },
    });
    if (limit && (await getMemberMonthUnits(account.teamId, account.userId)) >= limit.monthlyUnits) {
      return { message: MEMBER_CAP_MESSAGE };
    }
  }
  return null;
}

/** Records what an interaction cost and takes it from the account's purchases, oldest first.
 *  If the purchases do not cover it, the shortfall goes onto the newest purchase, which then
 *  holds a negative amount, so the balance can go below zero and the totals still agree.
 *  Does nothing, and returns the current balance in credits, if no tokens were used. */
export async function recordUsage(args: {
  account: Account;
  pageType: AiPageType;
  fileId: number | null;
  source: AiUsageSource;
  model: AiModelKey;
  usage: UsageTally;
}): Promise<number> {
  const { account, pageType, fileId, source, model, usage } = args;
  const { userId, teamId } = account;
  const pool = poolWhere(account);
  if (usage.input + usage.output === 0) return getBalanceCredits(account);

  const cost = BigInt(Math.round(usage.cost * UNITS_PER_DOLLAR));

  return db.$transaction(async (tx) => {
    await tx.aiUsageLog.create({
      data: {
        userId,
        teamId,
        pageType,
        fileId,
        source,
        model,
        inputTokens: usage.input - usage.cacheRead - usage.cacheWrite,
        cacheReadTokens: usage.cacheRead,
        cacheWriteTokens: usage.cacheWrite,
        outputTokens: usage.output,
        costUnits: cost,
      },
    });

    let left = cost;
    const lots = await tx.aiCreditBalance.findMany({
      where: { ...pool, remaining: { gt: BigInt(0) } },
      orderBy: { purchaseId: "asc" },
    });
    for (const lot of lots) {
      if (left === BigInt(0)) break;
      const take = lot.remaining < left ? lot.remaining : left;
      await tx.aiCreditBalance.update({ where: { id: lot.id }, data: { remaining: { decrement: take } } });
      left -= take;
    }
    if (left > BigInt(0)) {
      // Not enough left: put the shortfall on the newest purchase.
      const newest = await tx.aiCreditBalance.findFirst({ where: pool, orderBy: { purchaseId: "desc" } });
      if (newest) {
        await tx.aiCreditBalance.update({ where: { id: newest.id }, data: { remaining: { decrement: left } } });
      } else {
        // An account with no purchases at all: record the debt as a purchase of zero units.
        const reference = teamId !== null ? `debt:team:${teamId}` : `debt:${userId}`;
        const purchase =
          (await tx.aiCreditPurchase.findUnique({ where: { source_reference: { source: "manual", reference } } })) ??
          (await tx.aiCreditPurchase.create({
            data: { userId, teamId, units: BigInt(0), source: "manual", reference, description: "Usage with no credits" },
          }));
        await tx.aiCreditBalance.upsert({
          where: { purchaseId: purchase.id },
          create: { purchaseId: purchase.id, userId, teamId, remaining: -left },
          update: { remaining: { decrement: left } },
        });
      }
    }

    const sum = await tx.aiCreditBalance.aggregate({ where: pool, _sum: { remaining: true } });
    return unitsToCredits(sum._sum.remaining ?? BigInt(0));
  });
}

/** Adds credits to an account: a purchase and the balance row for it, together. `userId` is who bought or
 *  was granted them; `teamId` (when set) puts them in that team's shared pool. `source` and
 *  `reference` together are unique, so a repeated call (a retried webhook, a second welcome
 *  grant) adds nothing. Returns true if credits were added. */
export async function grantCredits(args: {
  userId: number;
  teamId?: number | null;
  units: bigint;
  source: "stripe" | "grant" | "manual";
  reference: string;
  description?: string;
}): Promise<boolean> {
  const { userId, units, source, reference, description } = args;
  const teamId = args.teamId ?? null;
  const existing = await db.aiCreditPurchase.findUnique({ where: { source_reference: { source, reference } } });
  if (existing) return false;
  try {
    await db.$transaction(async (tx) => {
      const purchase = await tx.aiCreditPurchase.create({
        data: { userId, teamId, units, source, reference, description: description ?? null },
      });
      await tx.aiCreditBalance.create({ data: { purchaseId: purchase.id, userId, teamId, remaining: units } });
    });
    return true;
  } catch (err) {
    // Two requests added the same purchase at once; the unique key let only one through.
    if (err instanceof Error && err.message.includes("Unique constraint")) return false;
    throw err;
  }
}
