import type {
  PersistenceListQuery,
  PersistenceListResult,
  PersistenceRecordBase,
  PersistenceWriteMetadata
} from "./persistence-base.contract";

export interface RepositoryFindOptions {
  includeDeleted?: boolean;
}

export interface RepositoryUpdateOptions {
  metadata?: PersistenceWriteMetadata;
}

export interface RepositorySoftDeleteOptions {
  metadata?: PersistenceWriteMetadata;
}

export interface RepositoryBaseContract<
  TRecord extends PersistenceRecordBase,
  TCreateInput,
  TUpdateInput
> {
  findById(id: string, options?: RepositoryFindOptions): Promise<TRecord | null>;
  list(query?: PersistenceListQuery): Promise<PersistenceListResult<TRecord>>;
  create(input: TCreateInput, options?: RepositoryUpdateOptions): Promise<TRecord>;
  updateById(id: string, input: TUpdateInput, options?: RepositoryUpdateOptions): Promise<TRecord>;
  softDeleteById(id: string, options?: RepositorySoftDeleteOptions): Promise<void>;
  restoreById(id: string, options?: RepositoryUpdateOptions): Promise<void>;
}

export const repository_contract_deferred_todos = {
  optimisticConcurrency: "TODO",
  partialUpdateMergePolicy: "TODO",
  domainSpecificRepositoryMethods: "TODO"
} as const;

