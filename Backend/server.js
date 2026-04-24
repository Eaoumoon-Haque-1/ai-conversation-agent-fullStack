require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { analyzeGoal, evaluateProgress } = require("./ai-agent");
const storage = require("./storage");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ================== CREATE GOAL ==================
app.post("/api/goals", async (req, res) => {
  try {
    const { goalText, durationDays } = req.body;

    if (!goalText || !durationDays) {
      return res.status(400).json({
        error: "goalText and durationDays are required",
      });
    }

    const numericDuration = Number(durationDays);

    if (Number.isNaN(numericDuration) || numericDuration <= 0) {
      return res.status(400).json({
        error: "durationDays must be a positive number",
      });
    }

    const plan = await analyzeGoal(goalText, numericDuration);

    if (!plan || !Array.isArray(plan.dailyTasks)) {
      return res.status(500).json({
        error: "Invalid plan returned from AI",
      });
    }

    const goal = storage.saveGoal({
      title: goalText,
      durationDays: numericDuration,
      plan,
      status: "active",
    });

    const tasks = storage.saveTasks(goal.id, plan.dailyTasks);
    const latestProgress = storage.syncProgressForGoal(goal.id);

    return res.status(201).json({
      message: "Goal created successfully",
      goal,
      tasks,
      latestProgress,
    });
  } catch (err) {
    console.error("POST /api/goals error:", err.message);
    return res.status(500).json({
      error: "Failed to create goal",
    });
  }
});

// ================== GET ALL GOALS ==================
app.get("/api/goals", (req, res) => {
  try {
    const goals = storage.getAllGoals();
    return res.json(goals);
  } catch (err) {
    console.error("GET /api/goals error:", err.message);
    return res.status(500).json({
      error: "Failed to fetch goals",
    });
  }
});

// ================== GET ONE GOAL DETAILS ==================
app.get("/api/goals/:goalId", (req, res) => {
  try {
    const goalDetails = storage.getGoalDetails(req.params.goalId);

    if (!goalDetails) {
      return res.status(404).json({
        error: "Goal not found",
      });
    }

    return res.json(goalDetails);
  } catch (err) {
    console.error("GET /api/goals/:goalId error:", err.message);
    return res.status(500).json({
      error: "Failed to fetch goal details",
    });
  }
});

// ================== GET TASKS BY GOAL ==================
app.get("/api/goals/:goalId/tasks", (req, res) => {
  try {
    const goal = storage.getGoal(req.params.goalId);

    if (!goal) {
      return res.status(404).json({
        error: "Goal not found",
      });
    }

    const tasks = storage.getTasksByGoal(req.params.goalId);
    return res.json(tasks);
  } catch (err) {
    console.error("GET /api/goals/:goalId/tasks error:", err.message);
    return res.status(500).json({
      error: "Failed to fetch tasks",
    });
  }
});

// ================== UPDATE TASK ==================
app.patch("/api/tasks/:taskId", (req, res) => {
  try {
    const { completed, title, description } = req.body;

    const existingTask = storage.getTaskById(req.params.taskId);

    if (!existingTask) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    const updates = {};

    if (typeof completed === "boolean") {
      updates.completed = completed;
    }

    if (typeof title === "string") {
      updates.title = title;
    }

    if (typeof description === "string") {
      updates.description = description;
    }

    const updatedTask = storage.updateTask(req.params.taskId, updates);
    const latestProgress = storage.getLatestProgressByGoal(existingTask.goalId);

    return res.json({
      message: "Task updated successfully",
      task: updatedTask,
      latestProgress,
    });
  } catch (err) {
    console.error("PATCH /api/tasks/:taskId error:", err.message);
    return res.status(500).json({
      error: "Failed to update task",
    });
  }
});

// ================== EVALUATE GOAL ==================
app.post("/api/goals/:goalId/evaluate", async (req, res) => {
  try {
    const goal = storage.getGoal(req.params.goalId);

    if (!goal) {
      return res.status(404).json({
        error: "Goal not found",
      });
    }

    const tasks = storage.getTasksByGoal(goal.id);
    const completedCount = tasks.filter((t) => t.completed).length;

    const createdDays = Math.max(
      1,
      Math.ceil(
        (Date.now() - new Date(goal.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    const evaluation = await evaluateProgress(
      goal,
      completedCount,
      tasks.length,
      createdDays
    );

    if (!evaluation) {
      return res.status(500).json({
        error: "Failed to evaluate goal",
      });
    }

    return res.json({
      goalId: goal.id,
      evaluation,
    });
  } catch (err) {
    console.error("POST /api/goals/:goalId/evaluate error:", err.message);
    return res.status(500).json({
      error: "Failed to evaluate progress",
    });
  }
});

// ================== DELETE GOAL ==================
app.delete("/api/goals/:goalId", (req, res) => {
  try {
    const goal = storage.getGoal(req.params.goalId);

    if (!goal) {
      return res.status(404).json({
        error: "Goal not found",
      });
    }

    storage.deleteGoal(req.params.goalId);

    return res.json({
      message: "Goal deleted successfully",
    });
  } catch (err) {
    console.error("DELETE /api/goals/:goalId error:", err.message);
    return res.status(500).json({
      error: "Failed to delete goal",
    });
  }
});

// ================== SERVER START ==================
app.listen(PORT, () => {
  console.log(`🚀 AI Task Agent running on http://localhost:${PORT}`);
});