import { redirect } from "next/navigation";
import { getSessionUser } from "@/utils/getSessionUser";
import { db } from "@/utils/db";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getStats() {
  const now       = new Date();
  const yesterday = new Date(now.getTime() -  1 * 24 * 60 * 60 * 1000);
  const weekAgo   = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);
  const monthAgo  = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 182 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersThisMonth,
    recentUsers,
    docsYesterday,
    docsLastWeek,
    docsLastMonth,
    totalDocs,
    totalWorkspaces,
    totalFolders,
    totalPartTrees,
    totalDatasets,
    totalTeams,
    totalComponents,
    totalFileImports,
    cadConnections,
    usersWithDocs,
    blocksYesterday,
    blocksLastWeek,
    blocksLastMonth,
    blocksByType,
  ] = await Promise.all([
    db.user.count(),
    db.user.findMany({ where: { createdAt: { gte: monthAgo } }, select: { id: true } }),
    // last 6 months for monthly chart
    db.user.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    db.file.count({ where: { fileTypeId: "Document", createdAt: { gte: yesterday }, deletedAt: null } }),
    db.file.count({ where: { fileTypeId: "Document", createdAt: { gte: weekAgo },  deletedAt: null } }),
    db.file.count({ where: { fileTypeId: "Document", createdAt: { gte: monthAgo }, deletedAt: null } }),
    db.file.count({ where: { fileTypeId: "Document", deletedAt: null } }),
    db.file.count({ where: { fileTypeId: "Workspace", deletedAt: null } }),
    db.file.count({ where: { fileTypeId: "Folder",   deletedAt: null } }),
    db.file.count({ where: { fileTypeId: "PartTree", deletedAt: null } }),
    db.dataset.count({ where: { deletedAt: null } }),
    db.team.count(),
    db.component.count({ where: { deletedAt: null } }),
    db.fileImport.count(),
    db.cadConnection.findMany({ where: { deletedAt: null }, select: { cadType: true } }),
    // distinct users who have created at least one document
    db.file.groupBy({ by: ["userId"], where: { fileTypeId: "Document", deletedAt: null } }),
    // block/component activity
    db.component.count({ where: { createdAt: { gte: yesterday }, deletedAt: null } }),
    db.component.count({ where: { createdAt: { gte: weekAgo },   deletedAt: null } }),
    db.component.count({ where: { createdAt: { gte: monthAgo },  deletedAt: null } }),
    db.component.groupBy({ by: ["componentTypeId"], where: { deletedAt: null }, _count: { id: true } }),
  ]);

  // Sign-up method breakdown for new users
  const newUserIds = newUsersThisMonth.map((u) => u.id);
  const [googleAccounts, facebookAccounts] = await Promise.all([
    db.oAuthAccount.findMany({ where: { provider: "google",   userId: { in: newUserIds } }, select: { userId: true } }),
    db.oAuthAccount.findMany({ where: { provider: "facebook", userId: { in: newUserIds } }, select: { userId: true } }),
  ]);
  const federatedIds   = new Set([...googleAccounts.map((a) => a.userId), ...facebookAccounts.map((a) => a.userId)]);
  const googleCount    = googleAccounts.length;
  const facebookCount  = facebookAccounts.length;
  const standardCount  = newUserIds.filter((id) => !federatedIds.has(id)).length;
  const newUsersCount  = newUsersThisMonth.length;

  // Monthly signups for the last 6 months
  const monthlyMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    monthlyMap[key] = 0;
  }
  for (const u of recentUsers) {
    if (!u.createdAt) continue;
    const key = u.createdAt.toLocaleString("default", { month: "short", year: "2-digit" });
    if (key in monthlyMap) monthlyMap[key]++;
  }
  const monthlySignups = Object.entries(monthlyMap).map(([month, count]) => ({ month, count }));

  // CAD connection breakdown
  const onshapeCount = cadConnections.filter((c) => c.cadType === "onshape").length;
  const fusionCount  = cadConnections.filter((c) => c.cadType === "fusion").length;

  const engagedUserCount = usersWithDocs.length;
  const engagementRate   = totalUsers > 0 ? Math.round((engagedUserCount / totalUsers) * 100) : 0;

  // Component type ID → human label
  const COMPONENT_LABELS: Record<number, string> = {
    1:  "Text",
    2:  "Header",
    3:  "Equation",
    4:  "Symbolic eq.",
    5:  "Table",
    6:  "For loop",
    7:  "While loop",
    8:  "If / Else",
    9:  "Plot",
    10: "Image",
    11: "Video",
    12: "Line break",
    13: "Surface map",
    14: "Slider",
    15: "Card",
    16: "Free body",
  };

  const blockTypeBreakdown = blocksByType
    .map((row) => ({
      label: COMPONENT_LABELS[row.componentTypeId] ?? `Type ${row.componentTypeId}`,
      count: row._count.id,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalUsers, newUsersCount,
    googleCount, facebookCount, standardCount,
    monthlySignups,
    docsYesterday, docsLastWeek, docsLastMonth, totalDocs,
    totalWorkspaces, totalFolders, totalPartTrees,
    totalDatasets, totalTeams,
    totalComponents, totalFileImports,
    onshapeCount, fusionCount,
    engagedUserCount, engagementRate,
    blocksYesterday, blocksLastWeek, blocksLastMonth,
    blockTypeBreakdown,
  };
}

// ─── UI Components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: {
  label: string; value: number | string; sub?: string; accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-2">
      <div className={`w-2 h-2 rounded-full ${accent}`} />
      <p className="text-3xl font-bold text-gray-900 tabular-nums">{Number(value).toLocaleString()}</p>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function Bar({ label, count, total, color, icon }: {
  label: string; count: number; total: number; color: string; icon?: React.ReactNode;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-gray-700 font-medium">
          {icon}
          {label}
        </span>
        <span className="tabular-nums text-gray-500">
          {count.toLocaleString()}
          <span className="text-gray-300 ml-1.5">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SimpleBar({ label, count, max, color = "bg-blue-500" }: {
  label: string; count: number; max: number; color?: string;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-sm text-gray-500 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-sm font-semibold text-gray-800 tabular-nums">
        {count.toLocaleString()}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
      {children}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function GoogleMark() {
  return (
    <svg width="13" height="13" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#1877F2">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <polyline points="3,5 12,13 21,5"/>
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function isAdminEmail(email: string): boolean {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const allowed = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export default async function AdminPage() {
  let session;
  try {
    session = await getSessionUser();
  } catch {
    redirect("/login");
  }

  if (!isAdminEmail(session.userEmail)) {
    redirect("/");
  }

  const s = await getStats();
  const docMax         = Math.max(s.docsLastMonth, 1);
  const blockMax       = Math.max(s.blocksLastMonth, 1);
  const blockTypeMax   = Math.max(...s.blockTypeBreakdown.map((b) => b.count), 1);
  const contentMax     = Math.max(s.totalDocs, s.totalWorkspaces, s.totalFolders, s.totalPartTrees, s.totalDatasets, 1);
  const cadMax         = Math.max(s.onshapeCount + s.fusionCount, 1);
  const monthlyMax     = Math.max(...s.monthlySignups.map((m) => m.count), 1);

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingLeft: 88 }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-10 py-7">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Platform overview — no tracking required</p>
      </div>

      <div className="px-10 py-8 flex flex-col gap-6 max-w-6xl">

        {/* ── Row 1: key numbers ── */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          <StatCard label="Users"       value={s.totalUsers}      accent="bg-blue-500" />
          <StatCard label="New (30d)"   value={s.newUsersCount}   accent="bg-emerald-500" />
          <StatCard label="Documents"   value={s.totalDocs}       accent="bg-violet-500" />
          <StatCard label="Workspaces"  value={s.totalWorkspaces} accent="bg-sky-500" />
          <StatCard label="Datasets"    value={s.totalDatasets}   accent="bg-amber-500" />
          <StatCard label="Teams"       value={s.totalTeams}      accent="bg-rose-500" />
        </div>

        {/* ── Row 2: Users ── */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Sign-up method */}
          <Section title="">
            <SectionHeader title="Sign-up method" sub={`Last 30 days · ${s.newUsersCount} new users`} />
            <div className="flex flex-col gap-4">
              <Bar label="Google"          count={s.googleCount}   total={s.newUsersCount} color="bg-blue-500"    icon={<GoogleMark />} />
              <Bar label="Facebook"        count={s.facebookCount} total={s.newUsersCount} color="bg-[#1877F2]"   icon={<FacebookMark />} />
              <Bar label="Email/password"  count={s.standardCount} total={s.newUsersCount} color="bg-gray-300"    icon={<EmailIcon />} />
            </div>
          </Section>

          {/* Monthly signups */}
          <Section title="">
            <SectionHeader title="Monthly sign-ups" sub="Last 6 months" />
            <div className="flex flex-col gap-3">
              {s.monthlySignups.map(({ month, count }) => (
                <div key={month} className="flex items-center gap-3">
                  <span className="w-14 text-xs text-gray-400 shrink-0">{month}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded"
                      style={{ width: `${Math.round((count / monthlyMax) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold text-gray-700 tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* ── Row 3: Content ── */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Document activity */}
          <Section title="">
            <SectionHeader title="Document activity" sub="New documents created" />
            <div className="flex flex-col gap-3">
              <SimpleBar label="Yesterday"    count={s.docsYesterday} max={docMax} />
              <SimpleBar label="Last 7 days"  count={s.docsLastWeek}  max={docMax} />
              <SimpleBar label="Last 30 days" count={s.docsLastMonth} max={docMax} />
            </div>
            <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
              <span>All-time documents</span>
              <span className="font-semibold text-gray-700 tabular-nums">{s.totalDocs.toLocaleString()}</span>
            </div>
          </Section>

          {/* Platform content breakdown */}
          <Section title="">
            <SectionHeader title="Platform content" sub="All-time totals by type" />
            <div className="flex flex-col gap-3">
              <SimpleBar label="Documents"   count={s.totalDocs}       max={contentMax} color="bg-violet-400" />
              <SimpleBar label="Workspaces"  count={s.totalWorkspaces} max={contentMax} color="bg-sky-400" />
              <SimpleBar label="Folders"     count={s.totalFolders}    max={contentMax} color="bg-gray-300" />
              <SimpleBar label="Part trees"  count={s.totalPartTrees}  max={contentMax} color="bg-amber-400" />
              <SimpleBar label="Datasets"    count={s.totalDatasets}   max={contentMax} color="bg-emerald-400" />
            </div>
          </Section>
        </div>

        {/* ── Row 4: Engagement + CAD ── */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* Engagement */}
          <Section title="">
            <SectionHeader title="User engagement" />
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-600">Created a document</span>
                  <span className="font-semibold tabular-nums text-gray-800">{s.engagedUserCount.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-400 rounded-full" style={{ width: `${s.engagementRate}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{s.engagementRate}% of all users</p>
              </div>
              <div className="pt-3 border-t border-gray-50 flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total equations/blocks</span>
                  <span className="font-semibold tabular-nums text-gray-800">{s.totalComponents.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Doc cross-references</span>
                  <span className="font-semibold tabular-nums text-gray-800">{s.totalFileImports.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </Section>

          {/* CAD connections */}
          <Section title="">
            <SectionHeader title="CAD connections" sub={`${(s.onshapeCount + s.fusionCount).toLocaleString()} total`} />
            <div className="flex flex-col gap-4">
              <Bar label="Onshape" count={s.onshapeCount} total={cadMax} color="bg-blue-400" />
              <Bar label="Fusion"  count={s.fusionCount}  total={cadMax} color="bg-orange-400" />
            </div>
          </Section>

          {/* Teams */}
          <Section title="">
            <SectionHeader title="Teams" />
            <div className="flex flex-col gap-4 mt-1">
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold text-gray-900 tabular-nums">{s.totalTeams}</span>
                <span className="text-sm text-gray-400 mb-1.5">teams created</span>
              </div>
              <div className="pt-3 border-t border-gray-50 flex justify-between text-sm">
                <span className="text-gray-500">Avg docs / workspace</span>
                <span className="font-semibold tabular-nums text-gray-800">
                  {s.totalWorkspaces > 0 ? (s.totalDocs / s.totalWorkspaces).toFixed(1) : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Avg docs / user</span>
                <span className="font-semibold tabular-nums text-gray-800">
                  {s.totalUsers > 0 ? (s.totalDocs / s.totalUsers).toFixed(1) : "—"}
                </span>
              </div>
            </div>
          </Section>

        </div>

        {/* ── Row 5: Block activity + type breakdown ── */}
        <div className="grid md:grid-cols-2 gap-6">

          <Section title="">
            <SectionHeader title="Block activity" sub="New blocks added" />
            <div className="flex flex-col gap-3">
              <SimpleBar label="Yesterday"    count={s.blocksYesterday} max={blockMax} color="bg-indigo-400" />
              <SimpleBar label="Last 7 days"  count={s.blocksLastWeek}  max={blockMax} color="bg-indigo-400" />
              <SimpleBar label="Last 30 days" count={s.blocksLastMonth} max={blockMax} color="bg-indigo-400" />
            </div>
            <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
              <span>All-time blocks</span>
              <span className="font-semibold text-gray-700 tabular-nums">{s.totalComponents.toLocaleString()}</span>
            </div>
          </Section>

          <Section title="">
            <SectionHeader title="Block types" sub="All blocks, sorted by usage" />
            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-72">
              {s.blockTypeBreakdown.map(({ label, count }) => {
                const pct = s.totalComponents > 0 ? Math.round((count / s.totalComponents) * 100) : 0;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-28 text-xs text-gray-500 shrink-0 truncate">{label}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 rounded-full"
                        style={{ width: `${Math.round((count / blockTypeMax) * 100)}%` }}
                      />
                    </div>
                    <span className="w-20 text-right text-xs text-gray-500 tabular-nums shrink-0">
                      {count.toLocaleString()} <span className="text-gray-300">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
              {s.blockTypeBreakdown.length === 0 && (
                <p className="text-xs text-gray-400 italic">No blocks yet.</p>
              )}
            </div>
          </Section>

        </div>

      </div>
    </div>
  );
}
