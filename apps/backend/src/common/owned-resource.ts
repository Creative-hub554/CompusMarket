import { ForbiddenException, NotFoundException } from "@nestjs/common";

/**
 * Structural view of the Prisma delegate methods used by the CRUD helpers.
 * The delegate is typed `unknown` at the boundary because Prisma's generated
 * arg types (NoteCreateArgs, …) are too rich to match structurally; the real
 * type safety lives in the per-service data builders below.
 */
type ModelDelegate<TRecord> = {
  create(args: unknown): Promise<TRecord>;
  findMany(args: unknown): Promise<TRecord[]>;
  findUnique(args: { where: { id: string } }): Promise<TRecord | null>;
  update(args: { where: { id: string }; data: unknown }): Promise<TRecord>;
  delete(args: { where: { id: string } }): Promise<TRecord>;
};

export interface OwnedResourceOptions<TRecord, TCreate, TUpdate> {
  /** Human-readable model name used in the 404 message, e.g. "Note". */
  name: string;
  /** Resolves the owning user id from a record. Defaults to `record.userId`. */
  ownerId?: (record: TRecord) => string;
  /** Builds the Prisma `create` payload. Default: `{ userId, ...data }`. */
  buildCreateData?: (userId: string, data: TCreate) => unknown;
  /** Builds the Prisma `update` payload. Default: only keys that are defined. */
  buildUpdateData?: (data: TUpdate) => unknown;
  /** Extra list filter beyond `userId`, e.g. a search term. */
  listWhere?: (userId: string, query?: string) => Record<string, unknown>;
  /** Default: `{ updatedAt: "desc" }`. */
  listOrderBy?: Record<string, "asc" | "desc">;
  listInclude?: Record<string, unknown>;
  findOneInclude?: Record<string, unknown>;
  createInclude?: Record<string, unknown>;
  updateInclude?: Record<string, unknown>;
}

export interface OwnedResource<TRecord, TCreate, TUpdate> {
  create(userId: string, data: TCreate): Promise<TRecord>;
  findByUser(userId: string, query?: string): Promise<TRecord[]>;
  findOne(id: string, userId: string): Promise<TRecord>;
  update(id: string, userId: string, data: TUpdate): Promise<TRecord>;
  remove(id: string, userId: string): Promise<TRecord>;
}

/** Picks only keys whose value is not `undefined` (used for partial updates). */
export function pickDefined<T extends object>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

/**
 * Factory for the ubiquitous "everything belongs to a user" CRUD shape shared
 * by notes, diagrams, documents, resumes, flashcards decks/cards and similar.
 *
 * Every resource gets the same contract:
 * - `create(userId, data)` scopes the record to the caller
 * - `findByUser(userId, query?)` lists only that user's records
 * - `findOne/update/remove` 404 when missing and 403 when owned by someone else
 *
 * Behaviors that differ per model (includes, search, data mapping) are wired
 * through `OwnedResourceOptions`; the caller's delegate may be a Prisma model
 * delegate (e.g. `prisma.note`) or anything with the same 5 methods.
 */
export function createOwnedResource<TRecord, TCreate, TUpdate>(
  delegate: unknown,
  options: OwnedResourceOptions<TRecord, TCreate, TUpdate>,
): OwnedResource<TRecord, TCreate, TUpdate> {
  const model = delegate as ModelDelegate<TRecord>;
  const getOwnerId = options.ownerId ?? ((record: TRecord) => (record as { userId: string }).userId);

  async function findOne(id: string, userId: string): Promise<TRecord> {
    const record = await model.findUnique({
      where: { id },
      ...(options.findOneInclude ? { include: options.findOneInclude } : {}),
    });
    if (!record) throw new NotFoundException(`${options.name} not found`);
    if (getOwnerId(record) !== userId) throw new ForbiddenException();
    return record;
  }

  return {
    async create(userId, data) {
      return model.create({
        data: options.buildCreateData
          ? options.buildCreateData(userId, data)
          : { userId, ...(data as object) },
        ...(options.createInclude ? { include: options.createInclude } : {}),
      });
    },
    async findByUser(userId, query) {
      return model.findMany({
        where: options.listWhere ? options.listWhere(userId, query) : { userId },
        orderBy: options.listOrderBy ?? { updatedAt: "desc" },
        ...(options.listInclude ? { include: options.listInclude } : {}),
      });
    },
    findOne,
    async update(id, userId, data) {
      await findOne(id, userId);
      return model.update({
        where: { id },
        data: options.buildUpdateData ? options.buildUpdateData(data) : pickDefined(data as object),
        ...(options.updateInclude ? { include: options.updateInclude } : {}),
      });
    },
    async remove(id, userId) {
      await findOne(id, userId);
      return model.delete({ where: { id } });
    },
  };
}