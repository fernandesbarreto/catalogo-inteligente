export interface CreatePaintDTO {
  name: string;
  color: string;
  colorHex: string;
  surfaceType: string;
  roomType: string;
  finish: string;
  features?: string | null;
  line?: string | null;
}

export interface UpdatePaintDTO extends Partial<CreatePaintDTO> {}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IPaintRepo {
  create(data: CreatePaintDTO): Promise<{ id: string } & CreatePaintDTO>;
  createWithEmbedding(
    data: CreatePaintDTO,
    embedding: number[]
  ): Promise<{ id: string } & CreatePaintDTO>;
  findById(id: string): Promise<({ id: string } & CreatePaintDTO) | null>;
  list(
    skip: number,
    take: number,
    q?: string
  ): Promise<PaginatedResult<{ id: string } & CreatePaintDTO>>;
  update(
    id: string,
    data: UpdatePaintDTO
  ): Promise<{ id: string } & CreatePaintDTO>;
  delete(id: string): Promise<void>;
}
