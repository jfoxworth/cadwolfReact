import { db } from "@/utils/db";

/** All non-deleted requirement-flagged blocks in the given files, in document order. */
export async function getRequirementBlocks(fileIds: number[]) {
  if (fileIds.length === 0) return [];
  return db.component.findMany({
    where: { fileId: { in: fileIds }, isRequirement: true, deletedAt: null },
    orderBy: [{ fileId: "asc" }, { order: "asc" }],
  });
}
