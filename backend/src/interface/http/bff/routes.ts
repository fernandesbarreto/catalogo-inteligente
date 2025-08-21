import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { specs } from "../../../swagger";
import { UseCaseFactory } from "../../../infra/factories/UseCaseFactory";

// Controllers
import { makeUsersController } from "./controllers/users.controller";
import { makePaintsController } from "./controllers/paints.controller";
import { makeAuthController } from "./controllers/auth.controller";
import { makeUserRolesController } from "./controllers/user-roles.controller";
import aiRoutes from "./routes/ai.routes";

// Auth
import { requireAuth } from "../middlewares/requireAuth";
import { attachRoles } from "../middlewares/attachRoles";
import { requireRole } from "../middlewares/requireRole";

const router = Router();

// PUBLIC ROUTES (no authentication required)
// Swagger documentation
router.use("/docs", swaggerUi.serve);
router.get(
  "/docs",
  swaggerUi.setup(specs, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Catálogo Inteligente API Documentation",
  })
);
router.get("/docs/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(specs);
});

// AUTH
const authCtl = makeAuthController(UseCaseFactory.login());
router.post("/auth/login", authCtl.login);

// PUBLIC PAINTS ENDPOINT (for browsing)
const publicPaintsCtl = makePaintsController({
  create: UseCaseFactory.createPaint(),
  update: UseCaseFactory.updatePaint(),
  list: UseCaseFactory.listPaints(),
  get: UseCaseFactory.getPaint(),
  delete: UseCaseFactory.deletePaint(),
});

router.get("/paints/public", publicPaintsCtl.listPublic);
router.get("/paints/public/:id", publicPaintsCtl.getPublic);

// GLOBAL AUTHENTICATION MIDDLEWARE
router.use(requireAuth, attachRoles);

// PROTECTED ROUTES (authentication required)

// AI ROUTES
router.use("/ai", aiRoutes);

// USERS (somente ADMIN)
const usersCtl = makeUsersController({
  create: UseCaseFactory.createUser(),
  update: UseCaseFactory.updateUser(),
  list: UseCaseFactory.listUsers(),
  get: UseCaseFactory.getUser(),
  delete: UseCaseFactory.deleteUser(),
});

router.get("/users", requireRole("ADMIN"), usersCtl.list);
router.post("/users", requireRole("ADMIN"), usersCtl.create);
router.get("/users/:id", requireRole("ADMIN"), usersCtl.get);
router.put("/users/:id", requireRole("ADMIN"), usersCtl.update);
router.delete("/users/:id", requireRole("ADMIN"), usersCtl.remove);

// USER ROLES mgmt (somente ADMIN)
const userRolesCtl = makeUserRolesController(UseCaseFactory.getUserRepo());
router.get("/users/:id/roles", requireRole("ADMIN"), userRolesCtl.list);
router.post("/users/:id/roles", requireRole("ADMIN"), userRolesCtl.add);
router.delete(
  "/users/:id/roles/:role",
  requireRole("ADMIN"),
  userRolesCtl.remove
);

export default router;
