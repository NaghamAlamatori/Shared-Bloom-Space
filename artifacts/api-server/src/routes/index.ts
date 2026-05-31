import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import bloomSpacesRouter from "./bloomspaces";
import eventsRouter from "./events";
import memoriesRouter from "./memories";
import notesRouter from "./notes";
import tasksRouter from "./tasks";
import focusRouter from "./focus";
import profileRouter from "./profile";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/bloomspaces", bloomSpacesRouter);
router.use("/events", eventsRouter);
router.use("/availability", async (req, res, next) => {
  // Redirect availability sub-routes to events router
  next();
});
router.use("/memories", memoriesRouter);
router.use("/notes", notesRouter);
router.use("/tasks", tasksRouter);
router.use("/focus-sessions", focusRouter);
router.use("/profile", profileRouter);
router.use("/dashboard", dashboardRouter);

export default router;
