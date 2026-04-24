const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Use whichever model is actually working in your OpenRouter setup
const MODEL_NAME = "gpt-4o-mini";

function extractJson(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Model did not return valid JSON");
  }

  return JSON.parse(jsonMatch[0]);
}

const analyzeGoal = async (goalText, durationDays) => {
  const prompt = `A user wants to "${goalText}" within ${durationDays} days.

Create a structured learning or execution plan.

Return ONLY valid JSON in this exact structure:
{
  "milestones": ["milestone 1", "milestone 2", "milestone 3"],
  "dailyTasks": [
    {
      "day": 1,
      "title": "Task title",
      "description": "Task description"
    }
  ],
  "successMetrics": ["metric 1", "metric 2", "metric 3"],
  "challenges": ["challenge 1", "challenge 2"],
  "motivationalApproach": "short motivational advice"
}

Rules:
- Return only JSON
- Do not use markdown
- Do not add extra explanation
- Make the daily tasks practical and beginner-friendly
- Try to align the number of dailyTasks with the given timeline`;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        {
          role: "system",
          content:
            "You are an expert learning planner and productivity coach. Always return only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    return extractJson(content);
  } catch (err) {
    console.error("analyzeGoal error:", err.message);
    throw err;
  }
};

const evaluateProgress = async (goal, completedTasks, totalTasks, days) => {
  const safeTotalTasks = Number(totalTasks) || 0;
  const safeDurationDays = Number(goal.durationDays) || 1;
  const safeCompletedTasks = Number(completedTasks) || 0;
  const safeDays = Number(days) || 1;

  const completionRate =
    safeTotalTasks === 0
      ? 0
      : Number(((safeCompletedTasks / safeTotalTasks) * 100).toFixed(2));

  const expectedRate = Number(((safeDays / safeDurationDays) * 100).toFixed(2));
  const onTrack = completionRate >= expectedRate - 10;

  const prompt = `Learning Goal: "${goal.title}"
Duration: ${goal.durationDays} days
Days Elapsed: ${safeDays}
Completed Tasks: ${safeCompletedTasks}
Total Tasks: ${safeTotalTasks}
Task Completion Rate: ${completionRate}%
Expected Completion Rate: ${expectedRate}%
Status: ${onTrack ? "ON TRACK" : "BEHIND"}

Return ONLY valid JSON in this exact structure:
{
  "analysis": "short honest performance analysis",
  "encouragement": "short supportive message",
  "nextAction": "1 to 3 lines of next action",
  "tip": "one practical weekly tip"
}

Rules:
- Return only JSON
- Do not use markdown
- Do not add extra explanation
- Be supportive but realistic`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        {
          role: "system",
          content:
            "You are a supportive and smart productivity coach. Always return only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
    });

    const content = response.choices[0].message.content;
    return extractJson(content);
  } catch (err) {
    console.error("evaluateProgress error:", err.message);
    throw err;
  }
};

module.exports = {
  analyzeGoal,
  evaluateProgress,
};