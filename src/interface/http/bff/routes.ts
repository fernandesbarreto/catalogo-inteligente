import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { UserRepoPrisma } from "../../../infra/db/repositories/UserRepoPrisma";
import { CreateUser } from "../../../use-cases/users/CreateUser";
import { UpdateUser } from "../../../use-cases/users/UpdateUser";
import { ListUsers } from "../../../use-cases/users/ListUsers";
import { GetUser } from "../../../use-cases/users/GetUser";
import { DeleteUser } from "../../../use-cases/users/DeleteUser";
import { makeUsersController } from "./controllers/users.controller";
import { PaintRepoPrisma } from "../../../infra/db/repositories/PaintRepoPrisma";
import { CreatePaint } from "../../../use-cases/paints/CreatePaint";
import { UpdatePaint } from "../../../use-cases/paints/UpdatePaint";
import { ListPaints } from "../../../use-cases/paints/ListPaints";
import { GetPaint } from "../../../use-cases/paints/GetPaint";
import { DeletePaint } from "../../../use-cases/paints/DeletePaint";
import { makePaintsController } from "./controllers/paints.controller";

const router = Router();
const prisma = new PrismaClient();

// Users
const userRepo = new UserRepoPrisma(prisma);
const usersCtl = makeUsersController({
  create: new CreateUser(userRepo),
  update: new UpdateUser(userRepo),
  list: new ListUsers(userRepo),
  get: new GetUser(userRepo),
  delete: new DeleteUser(userRepo),
});

router.get("/users", usersCtl.list);
router.post("/users", usersCtl.create);
router.get("/users/:id", usersCtl.get);
router.put("/users/:id", usersCtl.update);
router.delete("/users/:id", usersCtl.remove);

// Paints
const paintRepo = new PaintRepoPrisma(prisma);
const paintsCtl = makePaintsController({
  create: new CreatePaint(paintRepo),
  update: new UpdatePaint(paintRepo),
  list: new ListPaints(paintRepo),
  get: new GetPaint(paintRepo),
  delete: new DeletePaint(paintRepo),
});

router.get("/paints", paintsCtl.list);
router.post("/paints", paintsCtl.create);
router.get("/paints/:id", paintsCtl.get);
router.put("/paints/:id", paintsCtl.update);
router.delete("/paints/:id", paintsCtl.remove);

export default router;
