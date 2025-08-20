import { PrismaClient } from "@prisma/client";
import { PaintRepoPrisma } from "../db/repositories/PaintRepoPrisma";
import { UserRepoPrisma } from "../db/repositories/UserRepoPrisma";
import { OpenAIEmbeddingProvider } from "../ai/embeddings/OpenAIEmbeddingProvider";
import { CreatePaint } from "../../use-cases/paints/CreatePaint";
import { UpdatePaint } from "../../use-cases/paints/UpdatePaint";
import { DeletePaint } from "../../use-cases/paints/DeletePaint";
import { GetPaint } from "../../use-cases/paints/GetPaint";
import { ListPaints } from "../../use-cases/paints/ListPaints";
import { CreateUser } from "../../use-cases/users/CreateUser";
import { UpdateUser } from "../../use-cases/users/UpdateUser";
import { ListUsers } from "../../use-cases/users/ListUsers";
import { GetUser } from "../../use-cases/users/GetUser";
import { DeleteUser } from "../../use-cases/users/DeleteUser";
import { Login } from "../../use-cases/auth/login";

export class UseCaseFactory {
  private static prisma: PrismaClient;
  private static paintRepo: PaintRepoPrisma;
  private static userRepo: UserRepoPrisma;
  private static embeddingProvider: OpenAIEmbeddingProvider;

  private static getPrisma(): PrismaClient {
    if (!this.prisma) {
      this.prisma = new PrismaClient();
    }
    return this.prisma;
  }

  private static getPaintRepo(): PaintRepoPrisma {
    if (!this.paintRepo) {
      this.paintRepo = new PaintRepoPrisma(this.getPrisma());
    }
    return this.paintRepo;
  }

  static getUserRepo(): UserRepoPrisma {
    if (!this.userRepo) {
      this.userRepo = new UserRepoPrisma(this.getPrisma());
    }
    return this.userRepo;
  }

  private static getEmbeddingProvider(): OpenAIEmbeddingProvider {
    if (!this.embeddingProvider) {
      this.embeddingProvider = new OpenAIEmbeddingProvider();
    }
    return this.embeddingProvider;
  }

  // Paint use cases
  static createPaint(): CreatePaint {
    return new CreatePaint(this.getPaintRepo(), this.getEmbeddingProvider());
  }

  static updatePaint(): UpdatePaint {
    return new UpdatePaint(this.getPaintRepo());
  }

  static deletePaint(): DeletePaint {
    return new DeletePaint(this.getPaintRepo());
  }

  static getPaint(): GetPaint {
    return new GetPaint(this.getPaintRepo());
  }

  static listPaints(): ListPaints {
    return new ListPaints(this.getPaintRepo());
  }

  // User use cases
  static createUser(): CreateUser {
    return new CreateUser(this.getUserRepo());
  }

  static updateUser(): UpdateUser {
    return new UpdateUser(this.getUserRepo());
  }

  static listUsers(): ListUsers {
    return new ListUsers(this.getUserRepo());
  }

  static getUser(): GetUser {
    return new GetUser(this.getUserRepo());
  }

  static deleteUser(): DeleteUser {
    return new DeleteUser(this.getUserRepo());
  }

  static login(): Login {
    return new Login(this.getUserRepo());
  }

  // Cleanup
  static async dispose(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }
}
