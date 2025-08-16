export interface CreateUserDTO {
  email: string;
  passwordHash: string;
}

export interface UpdateUserDTO {
  email?: string;
  passwordHash?: string;
}

export interface IUserRepo {
  create(data: CreateUserDTO): Promise<{ id: string; email: string }>;

  findById(id: string): Promise<{ id: string; email: string } | null>;

  findByEmail(
    email: string
  ): Promise<{ id: string; email: string; passwordHash: string } | null>;

  list(
    skip: number,
    take: number
  ): Promise<Array<{ id: string; email: string }>>;

  update(
    id: string,
    data: UpdateUserDTO
  ): Promise<{ id: string; email: string }>;

  delete(id: string): Promise<void>;
}
