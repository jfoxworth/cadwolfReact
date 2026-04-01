"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

interface CadUser {
  id: string;
  name: string;
  email?: string;
  image?: string;
}

interface Props {
  onshapeConnected: boolean;
  fusionConnected: boolean;
}

function CadCard({
  title,
  logoSrc,
  logoAlt,
  connected,
  user,
  loading,
  connectHref,
  onDisconnect,
}: {
  title: string;
  logoSrc: string;
  logoAlt: string;
  connected: boolean;
  user: CadUser | null;
  loading: boolean;
  connectHref: string;
  onDisconnect: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4 w-full max-w-sm">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt={logoAlt} className="h-8 w-auto object-contain" />
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <span
          className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
            connected
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>

      {connected && (
        <div className="flex items-center gap-3 min-h-[48px]">
          {loading ? (
            <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse" />
          ) : user ? (
            <>
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name}
                  className="h-10 w-10 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-800">{user.name}</span>
                {user.email && (
                  <span className="text-xs text-gray-500">{user.email}</span>
                )}
              </div>
            </>
          ) : (
            <span className="text-sm text-gray-400">Could not load user info</span>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-auto">
        {connected ? (
          <button
            onClick={onDisconnect}
            className="flex-1 text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            Disconnect
          </button>
        ) : (
          <a
            href={connectHref}
            className="flex-1 text-sm px-4 py-2 rounded-lg bg-blue-600 text-white text-center hover:bg-blue-700 transition-colors"
          >
            Connect
          </a>
        )}
      </div>
    </div>
  );
}

export default function CadConnectPage({ onshapeConnected, fusionConnected }: Props) {
  const searchParams = useSearchParams();
  const [onshapeUser, setOnshapeUser] = useState<CadUser | null>(null);
  const [fusionUser, setFusionUser] = useState<CadUser | null>(null);
  const [onshapeLoading, setOnshapeLoading] = useState(onshapeConnected);
  const [fusionLoading, setFusionLoading] = useState(fusionConnected);
  const [onshapeConn, setOnshapeConn] = useState(onshapeConnected);
  const [fusionConn, setFusionConn] = useState(fusionConnected);
  const [toast, setToast] = useState<string | null>(null);

  // Show success toast from OAuth callback redirect
  useEffect(() => {
    const result = searchParams.get("cad_auth");
    if (result === "onshape_success") setToast("Onshape connected successfully!");
    else if (result === "fusion_success") setToast("Fusion 360 connected successfully!");
    else if (result === "error") setToast("Connection failed. Please try again.");
    if (result) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  // Fetch Onshape user info
  useEffect(() => {
    if (!onshapeConn) { setOnshapeLoading(false); return; }
    setOnshapeLoading(true);
    fetch("/api/onshape/me")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { setOnshapeUser(data); setOnshapeLoading(false); })
      .catch(() => setOnshapeLoading(false));
  }, [onshapeConn]);

  // Fetch Fusion user info
  useEffect(() => {
    if (!fusionConn) { setFusionLoading(false); return; }
    setFusionLoading(true);
    fetch("/api/fusion/me")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { setFusionUser(data); setFusionLoading(false); })
      .catch(() => setFusionLoading(false));
  }, [fusionConn]);

  async function disconnectOnshape() {
    await fetch("/api/auth/onshape/disconnect", { method: "DELETE" });
    setOnshapeConn(false);
    setOnshapeUser(null);
    setToast("Onshape disconnected.");
    setTimeout(() => setToast(null), 3000);
  }

  async function disconnectFusion() {
    await fetch("/api/auth/fusion/disconnect", { method: "DELETE" });
    setFusionConn(false);
    setFusionUser(null);
    setToast("Fusion 360 disconnected.");
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div
      className="min-h-screen py-12"
      style={{ paddingLeft: 350, paddingRight: 150 }}
    >
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-5 py-3 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">CAD Connections</h1>
        <p className="text-gray-500 mb-8">
          Connect your CAD accounts to sync parameters and pull physical properties into CadWolf.
        </p>

        <div className="flex flex-wrap gap-6">
          <CadCard
            title="Onshape"
            logoSrc="https://www.onshape.com/favicon.ico"
            logoAlt="Onshape"
            connected={onshapeConn}
            user={onshapeUser}
            loading={onshapeLoading}
            connectHref="/api/auth/onshape"
            onDisconnect={disconnectOnshape}
          />

          <CadCard
            title="Fusion 360"
            logoSrc="https://www.autodesk.com/favicon.ico"
            logoAlt="Fusion 360"
            connected={fusionConn}
            user={fusionUser}
            loading={fusionLoading}
            connectHref="/api/auth/fusion"
            onDisconnect={disconnectFusion}
          />
        </div>
      </div>
    </div>
  );
}
