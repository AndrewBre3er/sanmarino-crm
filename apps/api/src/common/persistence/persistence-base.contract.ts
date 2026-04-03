export type PersistenceId = string;

export interface PersistenceTimestamps {
  createdAt: string;
  updatedAt: string;
}

export interface PersistenceVersioning {
  version?: number;
  // TODO: finalize optimistic locking policy when business repositories are introduced.
}

export interface SoftDeleteMarkers {
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
  isDeleted?: boolean;
}

export interface PersistenceRecordBase
  extends PersistenceTimestamps,
    PersistenceVersioning,
    SoftDeleteMarkers {
  id: PersistenceId;
}

export interface PersistenceWriteMetadata {
  actorId?: string;
  reason?: string;
  requestId?: string;
  correlationId?: string;
}

export interface PersistenceListQuery {
  limit?: number;
  cursor?: string;
  includeDeleted?: boolean;
}

export interface PersistenceListResult<TEntity> {
  items: TEntity[];
  nextCursor?: string;
}

export const persistence_base_field_conventions = {
  id: "id",
  createdAt: "created_at",
  updatedAt: "updated_at",
  version: "version",
  deletedAt: "deleted_at",
  deletedBy: "deleted_by",
  deleteReason: "delete_reason",
  isDeleted: "is_deleted"
} as const;

