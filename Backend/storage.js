const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const FILES = {
  goals: path.join(DATA_DIR, "goals.json"),
  tasks: path.join(DATA_DIR, "tasks.json"),
  progress: path.join(DATA_DIR, "progress.json"),
};

Object.values(FILES).forEach((file) => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify([], null, 2));
  }
});

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
};

const writeJson = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

const generateId = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const storage = {
  // ===== Goals =====
  getAllGoals: () => {
    return readJson(FILES.goals);
  },

  getGoal: (goalId) => {
    const goals = storage.getAllGoals();
    return goals.find((g) => g.id === goalId) || null;
  },

  saveGoal: (goal) => {
    const goals = storage.getAllGoals();

    const newGoal = {
      id: goal.id || generateId(),
      title: goal.title,
      durationDays: Number(goal.durationDays),
      plan: goal.plan || null,
      status: goal.status || "active",
      createdAt: goal.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const index = goals.findIndex((g) => g.id === newGoal.id);

    if (index >= 0) {
      goals[index] = { ...goals[index], ...newGoal };
    } else {
      goals.push(newGoal);
    }

    writeJson(FILES.goals, goals);
    return newGoal;
  },

  updateGoal: (goalId, updates) => {
    const goals = storage.getAllGoals();
    const index = goals.findIndex((g) => g.id === goalId);

    if (index === -1) return null;

    goals[index] = {
      ...goals[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    writeJson(FILES.goals, goals);
    return goals[index];
  },

  deleteGoal: (goalId) => {
    // delete goal
    const goals = storage.getAllGoals().filter((g) => g.id !== goalId);
    writeJson(FILES.goals, goals);

    // delete related tasks
    const tasks = storage.getAllTasks().filter((t) => t.goalId !== goalId);
    writeJson(FILES.tasks, tasks);

    // delete related progress
    const progress = storage
      .getAllProgress()
      .filter((p) => p.goalId !== goalId);
    writeJson(FILES.progress, progress);

    return true;
  },

  // ===== Tasks =====
  getAllTasks: () => {
    return readJson(FILES.tasks);
  },

  getTaskById: (taskId) => {
    const tasks = storage.getAllTasks();
    return tasks.find((t) => t.id === taskId) || null;
  },

  getTasksByGoal: (goalId) => {
    const tasks = storage.getAllTasks();
    return tasks
      .filter((t) => t.goalId === goalId)
      .sort((a, b) => Number(a.day) - Number(b.day));
  },

  saveTasks: (goalId, tasks = []) => {
    const allTasks = storage.getAllTasks();
    const remainingTasks = allTasks.filter((t) => t.goalId !== goalId);

    const now = new Date().toISOString();

    const normalizedTasks = tasks.map((task, idx) => ({
      id: task.id || generateId(),
      goalId,
      day: Number(task.day ?? idx + 1),
      title: task.title || `Task ${idx + 1}`,
      description: task.description || "",
      completed: Boolean(task.completed),
      createdAt: task.createdAt || now,
      updatedAt: now,
    }));

    writeJson(FILES.tasks, [...remainingTasks, ...normalizedTasks]);
    return normalizedTasks;
  },

  updateTask: (taskId, updates) => {
    const tasks = storage.getAllTasks();
    const index = tasks.findIndex((t) => t.id === taskId);

    if (index === -1) return null;

    tasks[index] = {
      ...tasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    writeJson(FILES.tasks, tasks);

    // auto-sync progress for the goal after task update
    storage.syncProgressForGoal(tasks[index].goalId);

    return tasks[index];
  },

  // ===== Progress =====
  getAllProgress: () => {
    return readJson(FILES.progress);
  },

  getProgressByGoal: (goalId) => {
    const progress = storage.getAllProgress();
    return progress.filter((p) => p.goalId === goalId);
  },

  getLatestProgressByGoal: (goalId) => {
    const records = storage.getProgressByGoal(goalId);
    if (!records.length) return null;

    return records.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
  },

  saveProgress: (goalId, progress) => {
    const allProgress = storage.getAllProgress();

    const newProgress = {
      id: progress.id || generateId(),
      goalId,
      completedTasks: Number(progress.completedTasks || 0),
      totalTasks: Number(progress.totalTasks || 0),
      progressPercentage: Number(progress.progressPercentage || 0),
      timestamp: progress.timestamp || new Date().toISOString(),
    };

    allProgress.push(newProgress);
    writeJson(FILES.progress, allProgress);
    return newProgress;
  },

  syncProgressForGoal: (goalId) => {
    const tasks = storage.getTasksByGoal(goalId);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    const progressPercentage =
      totalTasks === 0 ? 0 : Number(((completedTasks / totalTasks) * 100).toFixed(2));

    return storage.saveProgress(goalId, {
      completedTasks,
      totalTasks,
      progressPercentage,
    });
  },

  // ===== Combined Helpers =====
  getGoalDetails: (goalId) => {
    const goal = storage.getGoal(goalId);
    if (!goal) return null;

    const tasks = storage.getTasksByGoal(goalId);
    const latestProgress = storage.getLatestProgressByGoal(goalId);

    return {
      ...goal,
      tasks,
      latestProgress,
    };
  },
};

module.exports = storage;