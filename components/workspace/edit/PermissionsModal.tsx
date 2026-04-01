"use client";

import { useState, useEffect } from "react";
import { X, Users, User } from "lucide-react";

interface Grant {
  id: number;
  subjectId: number;
  subjectType: string;
  level: string;
  name: string;
}

interface PermData {
  viewPerm: string;
  editPerm: string;
  adminPerm: string;
  grants: Grant[];
}

interface TeamOption {
  id: number;
  name: string;
}

interface Props {
  itemId: string;
  itemName: string;
  onClose: () => void;
}

const VIEW_OPTIONS = [
  { value: "everyone", label: "Anyone with the link" },
  { value: "list",     label: "Specific people & teams" },
  { value: "inherit",  label: "Same as parent" },
];

const RESTRICTED_OPTIONS = [
  { value: "list",    label: "Specific people & teams" },
  { value: "inherit", label: "Same as parent" },
];

const LEVEL_LABELS: Record<string, string> = { view: "View", edit: "Edit", admin: "Admin" };

export default function PermissionsModal({ itemId, itemName, onClose }: Props) {
  const [perms, setPerms] = useState<PermData | null>(null);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-user form
  const [addEmail, setAddEmail] = useState("");
  const [addUserLevel, setAddUserLevel] = useState("view");
  const [addingUser, setAddingUser] = useState(false);
  const [userError, setUserError] = useState("");

  // Add-team form
  const [addTeamId, setAddTeamId] = useState<string>("");
  const [addTeamLevel, setAddTeamLevel] = useState("view");
  const [addingTeam, setAddingTeam] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/file/${itemId}/permissions`).then((r) => r.json() as Promise<PermData>),
      fetch(`/api/teams`).then((r) => r.json() as Promise<TeamOption[]>),
    ]).then(([permData, teamData]) => {
      setPerms(permData);
      setTeams(teamData);
      if (teamData.length > 0) setAddTeamId(String(teamData[0].id));
      setLoading(false);
    });
  }, [itemId]);

  async function updateMode(key: "viewPerm" | "editPerm" | "adminPerm", value: string) {
    if (!perms) return;
    setPerms({ ...perms, [key]: value });
    await fetch(`/api/file/${itemId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
  }

  async function handleAddUser() {
    if (!addEmail.trim()) return;
    setAddingUser(true);
    setUserError("");
    const res = await fetch(`/api/file/${itemId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grantByEmail: { email: addEmail.trim(), level: addUserLevel } }),
    });
    setAddingUser(false);
    if (!res.ok) {
      const body = await res.json() as { error?: string };
      setUserError(body.error ?? "User not found");
      return;
    }
    setAddEmail("");
    refreshGrants();
  }

  async function handleAddTeam() {
    if (!addTeamId) return;
    setAddingTeam(true);
    await fetch(`/api/file/${itemId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grants: [{ subjectId: Number(addTeamId), subjectType: "team", level: addTeamLevel }] }),
    });
    setAddingTeam(false);
    refreshGrants();
  }

  async function handleRevoke(grant: Grant) {
    await fetch(`/api/file/${itemId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revokes: [{ subjectId: grant.subjectId, subjectType: grant.subjectType }] }),
    });
    setPerms((p) => p ? { ...p, grants: p.grants.filter((g) => g.id !== grant.id) } : p);
  }

  async function handleChangeLevel(grant: Grant, newLevel: string) {
    await fetch(`/api/file/${itemId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grants: [{ subjectId: grant.subjectId, subjectType: grant.subjectType, level: newLevel }] }),
    });
    refreshGrants();
  }

  async function refreshGrants() {
    const data = await fetch(`/api/file/${itemId}/permissions`).then((r) => r.json()) as PermData;
    setPerms((p) => p ? { ...p, grants: data.grants } : p);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Permissions</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-sm">{itemName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : perms ? (
            <>
              {/* View access */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Who can view?</p>
                <div className="flex flex-col gap-1.5">
                  {VIEW_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="radio"
                        name="viewPerm"
                        value={opt.value}
                        checked={perms.viewPerm === opt.value}
                        onChange={() => updateMode("viewPerm", opt.value)}
                        className="accent-blue-600"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Edit access — no "everyone" option */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Who can edit?</p>
                <div className="flex flex-col gap-1.5">
                  {RESTRICTED_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="radio"
                        name="editPerm"
                        value={opt.value}
                        checked={perms.editPerm === opt.value}
                        onChange={() => updateMode("editPerm", opt.value)}
                        className="accent-blue-600"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* People & teams with access */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  People & teams with explicit access
                </p>
                {perms.grants.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">None — access controlled by the settings above.</p>
                ) : (
                  <div className="flex flex-col divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                    {perms.grants.map((g) => (
                      <div key={g.id} className="flex items-center justify-between px-3 py-2.5 bg-white">
                        <div className="flex items-center gap-2.5">
                          <span className="text-gray-400">
                            {g.subjectType === "team" ? <Users size={15} /> : <User size={15} />}
                          </span>
                          <span className="text-sm text-gray-800">{g.name}</span>
                          {g.subjectType === "team" && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">team</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={g.level}
                            onChange={(e) => handleChangeLevel(g, e.target.value)}
                            className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="view">View</option>
                            <option value="edit">Edit</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => handleRevoke(g)}
                            className="text-xs text-red-400 hover:text-red-600 transition px-1"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add user */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add a person</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={addEmail}
                    onChange={(e) => { setAddEmail(e.target.value); setUserError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleAddUser()}
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={addUserLevel}
                    onChange={(e) => setAddUserLevel(e.target.value)}
                    className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(LEVEL_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddUser}
                    disabled={addingUser || !addEmail.trim()}
                    className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {addingUser ? "…" : "Add"}
                  </button>
                </div>
                {userError && <p className="text-xs text-red-500 mt-1">{userError}</p>}
              </div>

              {/* Add team */}
              {teams.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add a team</p>
                  <div className="flex gap-2">
                    <select
                      value={addTeamId}
                      onChange={(e) => setAddTeamId(e.target.value)}
                      className="flex-1 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <select
                      value={addTeamLevel}
                      onChange={(e) => setAddTeamLevel(e.target.value)}
                      className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(LEVEL_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddTeam}
                      disabled={addingTeam || !addTeamId}
                      className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {addingTeam ? "…" : "Add"}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
