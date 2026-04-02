"use client";

import { useEffect, useState } from "react";
import WorkspaceView from "./view/WorkspaceView";
import WorkspaceEdit from "./edit/WorkspaceEdit";
import type { WorkspacePageData } from "@/types/workspace";
import type { Item } from "@/types/item";

export interface CadConn {
  documentId: string;
  workspaceId?: string;
  href?: string;
}

interface WorkspaceWrapperProps {
  data: WorkspacePageData;
  canEdit: boolean;
  canAdmin: boolean;
  userId: number;
  canUpload?: boolean;
}

export default function WorkspaceWrapper({ data, canEdit, canAdmin, userId, canUpload = false }: WorkspaceWrapperProps) {
  const { workspace, items } = data;
  const [cadConns, setCadConns] = useState<Map<string, CadConn>>(new Map());

  useEffect(() => {
    const docIds = items
      .filter((i: Item) => i.type === "DOCUMENT")
      .map((i: Item) => Number(i.id));
    if (docIds.length === 0) return;

    fetch("/api/cad-connection/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileIds: docIds }),
    })
      .then((r) => r.json())
      .then((conns: Array<{ fileId: number; cadType: string; info: Record<string, unknown> }>) => {
        const map = new Map<string, CadConn>();
        for (const c of conns) {
          if (c.cadType === "onshape" && !map.has(String(c.fileId))) {
            const docId = c.info.documentId as string | undefined;
            map.set(String(c.fileId), {
              documentId: docId ?? "",
              workspaceId: c.info.workspaceId as string | undefined,
              href: docId ? `https://cad.onshape.com/documents/${docId}` : undefined,
            });
          }
        }
        setCadConns(map);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 py-10 w-full" style={{ paddingLeft: 350, paddingRight: 150, minWidth: 800 + 350 + 150, maxWidth: 1250 + 350 + 150 }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
        {workspace.description && (
          <div className="mt-1 text-gray-500 prose prose-base max-w-none" dangerouslySetInnerHTML={{ __html: workspace.description }} />
        )}
      </div>

      {canEdit ? (
        <WorkspaceEdit items={items} canAdmin={canAdmin} workspaceId={workspace.id} userId={userId} cadConns={cadConns} canUpload={canUpload} />
      ) : (
        <WorkspaceView items={items} cadConns={cadConns} />
      )}
    </div>
  );
}
