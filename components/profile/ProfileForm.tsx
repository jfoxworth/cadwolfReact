"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, AtSign, Briefcase, MapPin, Globe, Phone, FileText, Lock } from "lucide-react";

type CheckState = "idle" | "checking" | "available" | "taken" | "invalid" | "unchanged";

function useUsernameCheck(username: string, originalUsername: string) {
  const [state, setState] = useState<CheckState>("unchanged");
  const [errorMsg, setErrorMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!username || username === originalUsername) { setState("unchanged"); return; }

    setState("checking");
    timerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/auth/username-check?username=${encodeURIComponent(username)}`);
      const data = await res.json() as { available: boolean; error?: string };
      if (data.available) {
        setState("available");
        setErrorMsg("");
      } else {
        setState(data.error ? "invalid" : "taken");
        setErrorMsg(data.error ?? "Username already taken");
      }
    }, 350);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [username, originalUsername]);

  return { state, errorMsg };
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  username: string | null;
  photoUrl: string | null;
  title: string | null;
  bio: string | null;
  organization: string | null;
  location: string | null;
  website: string | null;
  phone: string | null;
}

export default function ProfileForm({ user }: { user: UserProfile }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: user.name ?? "",
    title: user.title ?? "",
    bio: user.bio ?? "",
    organization: user.organization ?? "",
    location: user.location ?? "",
    website: user.website ?? "",
    phone: user.phone ?? "",
  });

  const originalUsername = user.username ?? "";
  const [username, setUsername] = useState(originalUsername);
  const { state: usernameState, errorMsg: usernameError } = useUsernameCheck(username, originalUsername);

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailForm, setEmailForm] = useState({ newEmail: "", currentPassword: "" });
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (deleteConfirm !== "DELETE") {
      setDeleteError("Please type DELETE to confirm");
      return;
    }
    setDeleteError("");
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setDeleteError(data.error ?? "Failed to delete account");
      } else {
        router.push("/login");
      }
    } catch {
      setDeleteError("Network error");
    } finally {
      setDeletingAccount(false);
    }
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailMessage(null);
    setSavingEmail(true);
    try {
      const res = await fetch("/api/auth/request-email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailForm),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setEmailMessage({ type: "error", text: data.error ?? "Failed to send confirmation" });
      } else {
        setEmailMessage({ type: "success", text: `Confirmation sent to ${emailForm.newEmail}. Check your inbox.` });
        setEmailForm({ newEmail: "", currentPassword: "" });
        setShowEmailForm(false);
      }
    } catch {
      setEmailMessage({ type: "error", text: "Network error" });
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (usernameState === "checking" || usernameState === "taken" || usernameState === "invalid") {
      setMessage({ type: "error", text: usernameError || "Please fix your username before saving" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          username: username || null,
          title: form.title,
          bio: form.bio,
          organization: form.organization,
          location: form.location,
          website: form.website,
          phone: form.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Failed to save" });
      } else {
        setMessage({ type: "success", text: "Profile saved" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    if (passwords.newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "Password must be at least 8 characters" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMessage({ type: "error", text: data.error ?? "Failed to update password" });
      } else {
        setPasswordMessage({ type: "success", text: "Password updated" });
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch {
      setPasswordMessage({ type: "error", text: "Network error" });
    } finally {
      setSavingPassword(false);
    }
  }

  function field(
    label: string,
    key: keyof typeof form,
    icon: React.ReactNode,
    opts?: { placeholder?: string; type?: string; textarea?: boolean }
  ) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </span>
          {opts?.textarea ? (
            <textarea
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              placeholder={opts?.placeholder}
              rows={3}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
            />
          ) : (
            <input
              type={opts?.type ?? "text"}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              placeholder={opts?.placeholder}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Main profile form */}
      <form onSubmit={handleProfileSave} className="relative z-10 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-4 mb-2">
          {user.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoUrl}
              alt="Profile photo"
              className="w-14 h-14 rounded-full object-cover border border-gray-200 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xl font-semibold text-gray-500 uppercase shrink-0">
              {(user.name || user.email).charAt(0)}
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
        </div>

        {field("Full Name", "name", <User size={16} />, { placeholder: "Your name" })}

        {/* Username — editable */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <AtSign size={16} />
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.trim())}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          {usernameState === "checking" && (
            <p className="text-xs text-gray-400 mt-1">Checking…</p>
          )}
          {usernameState === "available" && (
            <p className="text-xs text-green-600 mt-1">Available!</p>
          )}
          {(usernameState === "taken" || usernameState === "invalid") && (
            <p className="text-xs text-red-600 mt-1">{usernameError}</p>
          )}
          {usernameState === "unchanged" && (
            <p className="text-xs text-gray-400 mt-1">
              Your workspace: cadwolf.com/workspace/{username || "—"}
            </p>
          )}
          {usernameState === "available" && (
            <p className="text-xs text-amber-600 mt-0.5">
              Changing your username will change your workspace URL.
            </p>
          )}
        </div>

        {/* Email — with change flow */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Mail size={16} />
            </span>
            <input
              type="email"
              value={user.email}
              readOnly
              className="w-full pl-10 pr-24 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => { setShowEmailForm((v) => !v); setEmailMessage(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {showEmailForm ? "Cancel" : "Change"}
            </button>
          </div>
          {emailMessage && (
            <p className={`text-xs mt-1 ${emailMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {emailMessage.text}
            </p>
          )}
          {showEmailForm && (
            <form onSubmit={handleEmailChange} className="mt-3 space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">New email address</label>
                <input
                  type="email"
                  required
                  value={emailForm.newEmail}
                  onChange={(e) => setEmailForm((f) => ({ ...f, newEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="new@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Current password (to confirm)</label>
                <input
                  type="password"
                  value={emailForm.currentPassword}
                  onChange={(e) => setEmailForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={savingEmail}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {savingEmail ? "Sending…" : "Send confirmation email"}
              </button>
            </form>
          )}
        </div>

        {field("Title / Role", "title", <Briefcase size={16} />, { placeholder: "e.g. Senior Engineer" })}
        {field("Bio", "bio", <FileText size={16} />, { placeholder: "A short bio about yourself", textarea: true })}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("Organization", "organization", <Briefcase size={16} />, { placeholder: "Company or organization" })}
          {field("Location", "location", <MapPin size={16} />, { placeholder: "City, Country" })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("Website", "website", <Globe size={16} />, { placeholder: "https://yoursite.com", type: "url" })}
          {field("Phone", "phone", <Phone size={16} />, { placeholder: "+1 555 000 0000" })}
        </div>

        {message && (
          <p className={`text-sm font-medium ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {message.text}
          </p>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </form>

      {/* Password change form */}
      <form onSubmit={handlePasswordSave} className="relative z-10 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Lock size={16} />
            </span>
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              autoComplete="current-password"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Lock size={16} />
              </span>
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                autoComplete="new-password"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Lock size={16} />
              </span>
              <input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        {passwordMessage && (
          <p className={`text-sm font-medium ${passwordMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {passwordMessage.text}
          </p>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={savingPassword}
            className="px-5 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
          >
            {savingPassword ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>

      {/* Delete account */}
      <div className="relative z-10 bg-white rounded-xl border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-700 mb-1">Delete Account</h2>
        <p className="text-sm text-gray-500 mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        {!showDeleteForm ? (
          <button
            type="button"
            onClick={() => setShowDeleteForm(true)}
            className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete my account
          </button>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                autoComplete="current-password"
                placeholder="Enter your password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                placeholder="DELETE"
              />
            </div>
            {deleteError && (
              <p className="text-sm text-red-600">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={deletingAccount}
                className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deletingAccount ? "Deleting…" : "Permanently delete account"}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteForm(false); setDeletePassword(""); setDeleteConfirm(""); setDeleteError(""); }}
                className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
