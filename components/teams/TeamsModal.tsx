"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Plus, ChevronLeft, Pencil, UserPlus, Trash2 } from "lucide-react";

interface TeamMember {
  userId: number;
  role: string;
  user: { id: number; name: string; email: string; username: string | null };
}

interface Team {
  id: number;
  name: string;
  description: string;
  ownerId: number;
  members: TeamMember[];
}

interface TeamsModalProps {
  currentUserId: number;
  onClose: () => void;
}

type View =
  | { type: "list" }
  | { type: "detail"; team: Team }
  | { type: "create" }
  | { type: "edit"; team: Team };

export default function TeamsModal({ currentUserId, onClose }: TeamsModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ type: "list" });
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teams");
      if (!res.ok) throw new Error("Failed to load teams");
      setTeams(await res.json());
    } catch {
      setError("Could not load teams.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function fetchTeamDetail(id: number): Promise<Team | null> {
    const res = await fetch(`/api/teams/${id}`);
    if (!res.ok) return null;
    return res.json();
  }

  async function openDetail(team: Team) {
    const detail = await fetchTeamDetail(team.id);
    if (detail) setView({ type: "detail", team: detail });
  }

  async function handleCreate() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), description: formDesc.trim() }),
      });
      if (!res.ok) throw new Error();
      await fetchTeams();
      setFormName("");
      setFormDesc("");
      setView({ type: "list" });
    } catch {
      setError("Failed to create team.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(teamId: number) {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), description: formDesc.trim() }),
      });
      if (!res.ok) throw new Error();
      const updated: Team = await res.json();
      setTeams((prev) => prev.map((t) => (t.id === teamId ? updated : t)));
      setView({ type: "detail", team: updated });
    } catch {
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMember(teamId: number) {
    if (!formEmail.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formEmail.trim() }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to add member");
      }
      const detail = await fetchTeamDetail(teamId);
      if (detail) setView({ type: "detail", team: detail });
      setFormEmail("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add member.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(teamId: number, memberId: number) {
    try {
      await fetch(`/api/teams/${teamId}/members/${memberId}`, { method: "DELETE" });
      const detail = await fetchTeamDetail(teamId);
      if (detail) setView({ type: "detail", team: detail });
    } catch {
      setError("Failed to remove member.");
    }
  }

  function startEdit(team: Team) {
    setFormName(team.name);
    setFormDesc(team.description ?? "");
    setError("");
    setView({ type: "edit", team });
  }

  function startCreate() {
    setFormName("");
    setFormDesc("");
    setError("");
    setView({ type: "create" });
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onMouseDown={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            {view.type !== "list" && (
              <button
                onClick={() => { setError(""); setView({ type: "list" }); }}
                className="text-gray-400 hover:text-gray-700 transition-colors mr-1"
                aria-label="Back"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {view.type === "list" && "Teams"}
              {view.type === "detail" && view.team.name}
              {view.type === "create" && "Create Team"}
              {view.type === "edit" && "Edit Team"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
          )}

          {/* LIST VIEW */}
          {view.type === "list" && (
            <>
              {loading ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : teams.length === 0 ? (
                <p className="text-sm text-gray-500">You are not a member of any teams yet.</p>
              ) : (
                <ul className="space-y-2">
                  {teams.map((team) => (
                    <li key={team.id}>
                      <button
                        onClick={() => { setError(""); openDetail(team); }}
                        className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <p className="font-medium text-gray-900">{team.name}</p>
                        {team.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{team.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {team.members.length} member{team.members.length !== 1 ? "s" : ""}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* DETAIL VIEW */}
          {view.type === "detail" && (() => {
            const team = view.team;
            const isOwner = team.ownerId === currentUserId;
            return (
              <div className="space-y-4">
                {team.description && (
                  <p className="text-sm text-gray-600">{team.description}</p>
                )}

                {/* Members list */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Members</h3>
                  <ul className="space-y-1">
                    {team.members.map((m) => (
                      <li key={m.userId} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{m.user?.name ?? `User ${m.userId}`}</p>
                          <p className="text-xs text-gray-400">{m.user?.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 capitalize">{m.role}</span>
                          {isOwner && m.userId !== currentUserId && (
                            <button
                              onClick={() => handleRemoveMember(team.id, m.userId)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                              aria-label="Remove member"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Add member (owner/admin) */}
                {isOwner && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Add Member</h3>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="Email address"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddMember(team.id); }}
                        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleAddMember(team.id)}
                        disabled={saving || !formEmail.trim()}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <UserPlus size={15} />
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* CREATE / EDIT FORM */}
          {(view.type === "create" || view.type === "edit") && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team name</label>
                <input
                  type="text"
                  placeholder="e.g. Structural Engineering"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="What does this team work on?"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 shrink-0 flex justify-between items-center">
          {view.type === "list" && (
            <>
              <span className="text-sm text-gray-400">{teams.length} team{teams.length !== 1 ? "s" : ""}</span>
              <button
                onClick={startCreate}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                New Team
              </button>
            </>
          )}

          {view.type === "detail" && (() => {
            const team = view.team;
            const isOwner = team.ownerId === currentUserId;
            return (
              <>
                <span />
                {isOwner && (
                  <button
                    onClick={() => startEdit(team)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Pencil size={15} />
                    Edit Team
                  </button>
                )}
              </>
            );
          })()}

          {view.type === "create" && (
            <>
              <button
                onClick={() => { setError(""); setView({ type: "list" }); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !formName.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Creating…" : "Create Team"}
              </button>
            </>
          )}

          {view.type === "edit" && (
            <>
              <button
                onClick={() => { setError(""); setView({ type: "detail", team: view.team }); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEdit(view.team.id)}
                disabled={saving || !formName.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
