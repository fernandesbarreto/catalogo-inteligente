import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { UserRepoPrisma } from "../../../infra/db/repositories/UserRepoPrisma";
import { CreateUser } from "../../../use-cases/users/CreateUser";
import { UpdateUser } from "../../../use-cases/users/UpdateUser";
import { ListUsers } from "../../../use-cases/users/ListUsers";
import { GetUser } from "../../../use-cases/users/GetUser";
import { DeleteUser } from "../../../use-cases/users/DeleteUser";
import { makeUsersController } from "./controllers/users.controller";

export const router = Router();

// wiring simples (substituir depois por um container DI)
const prisma = new PrismaClient();
const repo = new UserRepoPrisma(prisma);
const usersCtl = makeUsersController({
  create: new CreateUser(repo),
  update: new UpdateUser(repo),
  list: new ListUsers(repo),
  get: new GetUser(repo),
  delete: new DeleteUser(repo),
});

router.get("/users", usersCtl.list);
router.post("/users", usersCtl.create);
router.get("/users/:id", usersCtl.get);
router.put("/users/:id", usersCtl.update);
router.delete("/users/:id", usersCtl.remove);

export default router;
