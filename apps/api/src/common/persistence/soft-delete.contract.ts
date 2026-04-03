import type { PersistenceWriteMetadata, SoftDeleteMarkers } from "./persistence-base.contract";

export const soft_delete_persistence_conventions = {
  deletedAtField: "deleted_at",
  deletedByField: "deleted_by",
  deleteReasonField: "delete_reason",
  isDeletedField: "is_deleted",
  strategy: "deleted_at_primary_with_optional_boolean_marker"
} as const;

export interface SoftDeletePatch extends SoftDeleteMarkers {
  deletedAt: string;
}

export function is_soft_deleted(markers: SoftDeleteMarkers): boolean {
  return markers.isDeleted === true || Boolean(markers.deletedAt);
}

export function build_soft_delete_patch(
  metadata: PersistenceWriteMetadata = {},
  deleted_at_iso: string = new Date().toISOString()
): SoftDeletePatch {
  return {
    deletedAt: deleted_at_iso,
    isDeleted: true,
    ...(metadata.actorId ? { deletedBy: metadata.actorId } : {}),
    ...(metadata.reason ? { deleteReason: metadata.reason } : {})
  };
}

export function build_restore_patch(): SoftDeleteMarkers {
  return {
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
    isDeleted: false
  };
}

