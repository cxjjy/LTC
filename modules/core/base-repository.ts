import type { Prisma } from "@prisma/client";

type Delegate = {
  findUnique(args: Record<string, unknown>): Promise<unknown>;
  findFirst(args: Record<string, unknown>): Promise<unknown>;
  findMany(args: Record<string, unknown>): Promise<unknown>;
  count(args?: Record<string, unknown>): Promise<number>;
  create(args: Record<string, unknown>): Promise<unknown>;
  update(args: Record<string, unknown>): Promise<unknown>;
};

export class BaseRepository<TModel> {
  constructor(
    protected readonly model: Delegate,
    private readonly options: {
      softDelete?: boolean;
    } = {
      softDelete: true
    }
  ) {}

  protected withNotDeleted(where?: Prisma.InputJsonObject | Record<string, unknown>) {
    if (this.options.softDelete === false) {
      return where ?? {};
    }

    return {
      ...(where ?? {}),
      isDeleted: false
    };
  }

  async findById(id: string, include?: Record<string, unknown>) {
    return this.model.findFirst({
      where: this.withNotDeleted({ id }),
      include
    }) as Promise<TModel | null>;
  }

  async findFirst(where: Record<string, unknown>, include?: Record<string, unknown>) {
    return this.model.findFirst({
      where: this.withNotDeleted(where),
      include
    }) as Promise<TModel | null>;
  }

  async findMany(args: {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: Record<string, unknown> | Array<Record<string, unknown>>;
    skip?: number;
    take?: number;
  }) {
    return this.model.findMany({
      ...args,
      where: this.withNotDeleted(args.where)
    }) as Promise<TModel[]>;
  }

  async count(where?: Record<string, unknown>) {
    return this.model.count({
      where: this.withNotDeleted(where)
    });
  }

  async create(data: Record<string, unknown>, include?: Record<string, unknown>) {
    return this.model.create({ data, include }) as Promise<TModel>;
  }

  async update(id: string, data: Record<string, unknown>, include?: Record<string, unknown>) {
    return this.model.update({
      where: { id },
      data,
      include
    }) as Promise<TModel>;
  }

  async softDelete(id: string, userId: string) {
    if (this.options.softDelete === false) {
      throw new Error("This repository does not support soft delete");
    }

    return this.model.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedBy: userId
      }
    }) as Promise<TModel>;
  }
}
