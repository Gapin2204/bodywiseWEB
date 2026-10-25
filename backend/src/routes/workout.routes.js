const express = require("express");
const workout = require("../controllers/workout.controller");
const workoutProgram = require("../controllers/workout-program.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requireBody } = require("../middleware/validate.middleware");

const router = express.Router();
router.get("/workout-program", authenticate, workoutProgram.loadProgram);
router.put("/workout-program/preference", authenticate, requireBody, workoutProgram.updatePreference);
router.get("/exercises", authenticate, workout.listExercises);
router.get("/workout-sessions", authenticate, workout.listSessions);
router.post("/workout-sessions", authenticate, requireBody, workout.createSession);
router.get("/workout-sessions/:id", authenticate, workout.getSession);
router.patch("/workout-sessions/:id", authenticate, requireBody, workout.updateSession);
router.delete("/workout-sessions/:id", authenticate, workout.deleteSession);

module.exports = router;
