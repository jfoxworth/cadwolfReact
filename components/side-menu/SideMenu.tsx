"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  User,
  FolderOpen,
  Hash,
  Ruler,
  Plug,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import TeamsModal from "@/components/teams/TeamsModal";

const navItems = [
  {
    label: "Profile",
    href: "/profile",
    icon: User,
  },
  {
    label: "Workspaces",
    href: "/workspace/user-123",
    icon: FolderOpen,
  },
  {
    label: "Constants",
    href: "/constants",
    icon: Hash,
  },
  {
    label: "Units",
    href: "/units",
    icon: Ruler,
  },
  {
    label: "Connect",
    href: "/cadConnect",
    icon: Plug,
  },
];

interface SideMenuProps {
  user: { id: number; name: string; email: string };
}

export default function SideMenu({ user }: SideMenuProps) {
  const [expanded, setExpanded] = useState(true);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const router = useRouter();

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside
      className={`sticky top-0 h-screen shrink-0 bg-gray-900 text-white flex flex-col z-40 transition-all duration-300 ${
        expanded ? "w-56" : "w-16"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 shrink-0">
        {expanded ? (
          <Image src="/logobigwhite.png" alt="CADWOLF" width={120} height={36} />
        ) : (
          <Image src="/logoFaceWhite.png" alt="CADWOLF" width={32} height={32} />
        )}
      </div>

      <div className="border-t border-gray-700 mx-3" />

      {/* Profile */}
      <div className={`flex items-center gap-3 px-4 py-4 shrink-0 ${expanded ? "" : "justify-center"}`}>
        <div className="w-8 h-8 rounded-full bg-gray-600 shrink-0 flex items-center justify-center text-xs font-bold text-gray-300">
          {initials}
        </div>
        {expanded && (
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-700 mx-3" />

      {/* Nav Items */}
      <nav className="flex flex-col gap-1 px-2 py-4 flex-1">
        {navItems.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            className={`flex items-center gap-3 px-2 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors group ${
              expanded ? "" : "justify-center"
            }`}
            title={!expanded ? label : undefined}
          >
            <Icon size={20} className="shrink-0" />
            {expanded && (
              <span className="text-sm font-medium whitespace-nowrap">{label}</span>
            )}
          </a>
        ))}
        <button
          onClick={() => setTeamsOpen(true)}
          className={`flex items-center gap-3 px-2 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors ${
            expanded ? "" : "justify-center"
          }`}
          title={!expanded ? "Teams" : undefined}
        >
          <Users size={20} className="shrink-0" />
          {expanded && (
            <span className="text-sm font-medium whitespace-nowrap">Teams</span>
          )}
        </button>
      </nav>

      {teamsOpen && (
        <TeamsModal currentUserId={user.id} onClose={() => setTeamsOpen(false)} />
      )}

      {/* Collapse Toggle + Logout */}
      <div className="border-t border-gray-700 mx-3" />
      <div className={`flex items-center shrink-0 ${expanded ? "justify-between px-4" : "flex-col gap-1 px-2"} py-3`}>
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <>
              <ChevronLeft size={18} />
              <span className="text-sm">Collapse</span>
            </>
          ) : (
            <ChevronRight size={18} />
          )}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors"
          title="Sign out"
        >
          <LogOut size={18} />
          {expanded && <span className="text-sm">Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
