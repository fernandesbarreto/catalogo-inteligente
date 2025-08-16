import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import swaggerUi from "swagger-ui-express";
import { specs } from "../../../swagger";

// Repos
import { UserRepoPrisma } from "../../../infra/db/repositories/UserRepoPrisma";
import { PaintRepoPrisma } from "../../../infra/db/repositories/PaintRepoPrisma";

// Use cases - Users
import { CreateUser } from "../../../use-cases/users/CreateUser";
import { UpdateUser } from "../../../use-cases/users/UpdateUser";
import { ListUsers } from "../../../use-cases/users/ListUsers";
import { GetUser } from "../../../use-cases/users/GetUser";
import { DeleteUser } from "../../../use-cases/users/DeleteUser";

// Use cases - Paints
import { CreatePaint } from "../../../use-cases/paints/CreatePaint";
import { UpdatePaint } from "../../../use-cases/paints/UpdatePaint";
import { ListPaints } from "../../../use-cases/paints/ListPaints";
import { GetPaint } from "../../../use-cases/paints/GetPaint";
import { DeletePaint } from "../../../use-cases/paints/DeletePaint";

// Controllers
import { makeUsersController } from "./controllers/users.controller";
import { makePaintsController } from "./controllers/paints.controller";
import { makeAuthController } from "./controllers/auth.controller";
import { makeUserRolesController } from "./controllers/user-roles.controller";

// Auth
import { Login } from "../../../use-cases/auth/login"; // <- confira caixa/arquivo
import { requireAuth } from "../middlewares/requireAuth";
import { attachRoles } from "../middlewares/attachRoles";
import { requireRole } from "../middlewares/requireRole";

const router = Router();
const prisma = new PrismaClient();

// Swagger documentation
router.use("/docs", swaggerUi.serve);
router.get("/docs", swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Catálogo Inteligente API Documentation"
}));
router.get("/docs/swagger.json", (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

const userRepo = new UserRepoPrisma(prisma);
const paintRepo = new PaintRepoPrisma(prisma);

// AUTH
const authCtl = makeAuthController(new Login(userRepo));
router.post("/auth/login", authCtl.login);

router.use(requireAuth, attachRoles);

// USERS (somente ADMIN)
const usersCtl = makeUsersController({
  create: new CreateUser(userRepo),
  update: new UpdateUser(userRepo),
  list: new ListUsers(userRepo),
  get: new GetUser(userRepo),
  delete: new DeleteUser(userRepo),
});

router.get("/users", requireRole("ADMIN"), usersCtl.list);
router.post("/users", requireRole("ADMIN"), usersCtl.create);
router.get("/users/:id", requireRole("ADMIN"), usersCtl.get);
router.put("/users/:id", requireRole("ADMIN"), usersCtl.update);
router.delete("/users/:id", requireRole("ADMIN"), usersCtl.remove);

// USER ROLES mgmt (somente ADMIN)
const userRolesCtl = makeUserRolesController(userRepo);
router.get("/users/:id/roles", requireRole("ADMIN"), userRolesCtl.list);
router.post("/users/:id/roles", requireRole("ADMIN"), userRolesCtl.add);
router.delete(
  "/users/:id/roles/:role",
  requireRole("ADMIN"),
  userRolesCtl.remove
);

// PAINTS
const paintsCtl = makePaintsController({
  create: new CreatePaint(paintRepo),
  update: new UpdatePaint(paintRepo),
  list: new ListPaints(paintRepo),
  get: new GetPaint(paintRepo),
  delete: new DeletePaint(paintRepo),
});

// leitura para qualquer autenticado
router.get("/paints", requireRole("ADMIN", "EDITOR", "VIEWER"), paintsCtl.list);
router.get(
  "/paints/:id",
  requireRole("ADMIN", "EDITOR", "VIEWER"),
  paintsCtl.get
);

// escrita restrita
router.post("/paints", requireRole("ADMIN", "EDITOR"), paintsCtl.create);
router.put("/paints/:id", requireRole("ADMIN", "EDITOR"), paintsCtl.update);
router.delete("/paints/:id", requireRole("ADMIN"), paintsCtl.remove);

export default router;
