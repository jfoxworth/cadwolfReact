"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Trash2, UserMinus, Crown, Shield, User, ChevronDown } from "lucide-react";

interface TeamMemberBase {
  teamId: number;
  userId: number;
  role: string;
}

interface TeamBase {
  id: number;
  name: string;
  description: string | null;
  ownerId: number;
  createdAt: string;
  members: TeamMemberBase[];
}

interface EnrichedMember extends TeamMemberBase {
  user: { id: number; name: string; email: string; username: string | null };
}

interface TeamDetail extends TeamBase {
  members: EnrichedMember[];
}

interface Props {
  initialTeams: TeamBase[];
  userId: number;
}

export default function TeamsPage({ initialTeams, userId }: Props) {
  const [teams, setTeams] = useState<TeamBase[]>(initialTeams);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialTeams.length > 0 ? initialTeams[0].id : null,
  );
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create team form
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Add member
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"member" | "admin">("member");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  // Delete team confirm
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadDetail(id: number) {
    setDetailLoading(true);
    setDetail(null);
    const res = await fetch(`/api/teams/${id}`);
    if (res.ok) setDetail(await res.json());
    setDetailLoading(false);
  }

  async function selectTeam(id: number) {
    setSelectedId(id);
    setDeleteConfirm(false);
    setAddEmail("");
    setAddError("");
    await loadDetail(id);
  }

  useEffect(() => {
    if (initialTeams.length > 0) loadDetail(initialTeams[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
    });
    if (res.ok) {
      const team: TeamBase = await res.json();
      setTeams((prev) => [...prev, team]);
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      selectTeam(team.id);
    }
    setCreating(false);
  }

  async function handleAddMember() {
    if (!detail || !addEmail.trim()) return;
    setAdding(true);
    setAddError("");
    const res = await fetch(`/api/teams/${detail.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addEmail.trim(), role: addRole }),
    });
    if (res.ok) {
      setAddEmail("");
      await loadDetail(detail.id);
    } else {
      const body = await res.json().catch(() => ({}));
      setAddError((body as { error?: string }).error ?? "Failed to add member");
    }
    setAdding(false);
  }

  async function handleRemoveMember(memberId: number) {
    if (!detail) return;
    await fetch(`/api/teams/${detail.id}/members/${memberId}`, { method: "DELETE" });
    await loadDetail(detail.id);
  }

  async function handleDeleteTeam() {
    if (!detail) return;
    setDeleting(true);
    const res = await fetch(`/api/teams/${detail.id}`, { method: "DELETE" });
    if (res.ok) {
      const remaining = teams.filter((t) => t.id !== detail.id);
      setTeams(remaining);
      setDetail(null);
      setDeleteConfirm(false);
      if (remaining.length > 0) {
        selectTeam(remaining[0].id);
      } else {
        setSelectedId(null);
      }
    }
    setDeleting(false);
  }

  const isOwner = detail?.ownerId === userId;
  const isAdmin =
    isOwner || detail?.members.some((m) => m.userId === userId && m.role === "admin");

  function RoleIcon({ role, ownerId: oid, membUserId }: { role: string; ownerId: number; membUserId: number }) {
    if (membUserId === oid) return <Crown size={13} className="text-yellow-500 shrink-0" />;
    if (role === "admin") return <Shield size={13} className="text-blue-500 shrink-0" />;
    return <User size={13} className="text-gray-400 shrink-0" />;
  }

  return (
    <div className="min-h-screen flex items-start justify-center pt-16 pb-16 px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-7 py-6 border-b border-gray-100 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-gray-500" />
            Teams
          </h1>
          <button
            onClick={() => { setCreateOpen(true); setDeleteConfirm(false); }}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus size={14} />
            New Team
          </button>
        </div>

        {/* Create team form */}
        {createOpen && (
          <div className="px-7 py-5 border-b border-gray-100 bg-gray-50 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">New Team</p>
            <input
              autoFocus
              type="text"
              placeholder="Team name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setCreateOpen(false); setNewName(""); setNewDesc(""); }}
                className="text-sm px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                disabled={!newName.trim() || creating}
                onClick={handleCreate}
                className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        )}

        <div className="px-7 py-5 flex flex-col gap-5">
          {/* Team selector dropdown */}
          {teams.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-4">
              No teams yet. Create one above.
            </p>
          ) : (
            <div className="relative">
              <select
                value={selectedId ?? ""}
                onChange={(e) => selectTeam(Number(e.target.value))}
                className="w-full appearance-none border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-9 cursor-pointer"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Loading */}
          {detailLoading && (
            <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
          )}

          {/* Team detail */}
          {detail && !detailLoading && (
            <>
              {/* Description */}
              {detail.description && (
                <p className="text-sm text-gray-500 -mt-2">{detail.description}</p>
              )}

              {/* Members list */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Members · {detail.members.length}
                  </p>
                </div>
                {detail.members.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-b-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600 uppercase shrink-0">
                        {(m.user.name || m.user.email).charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                          <span className="truncate">{m.user.name || m.user.username || "—"}</span>
                          <RoleIcon role={m.role} ownerId={detail.ownerId} membUserId={m.userId} />
                        </p>
                        <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
                      </div>
                    </div>

                    {((isAdmin && m.userId !== detail.ownerId) ||
                      (m.userId === userId && m.userId !== detail.ownerId)) && (
                      <button
                        onClick={() => handleRemoveMember(m.userId)}
                        className="ml-3 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                        title="Remove member"
                      >
                        <UserMinus size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add member — admins/owners only */}
              {isAdmin && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add Member</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Email address"
                      value={addEmail}
                      onChange={(e) => { setAddEmail(e.target.value); setAddError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value as "member" | "admin")}
                      className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      disabled={!addEmail.trim() || adding}
                      onClick={handleAddMember}
                      className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {adding ? "Adding…" : "Add"}
                    </button>
                  </div>
                  {addError && <p className="text-xs text-red-500">{addError}</p>}
                </div>
              )}

              {/* Delete team — owner only */}
              {isOwner && (
                <div className="pt-2 border-t border-gray-100">
                  {!deleteConfirm ? (
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition"
                    >
                      <Trash2 size={14} />
                      Delete this team
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-gray-600">
                        Permanently delete <span className="font-medium">{detail.name}</span>? This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeleteConfirm(false)}
                          className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteTeam}
                          disabled={deleting}
                          className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
                        >
                          {deleting ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
