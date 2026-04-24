const OpenAI = require("openai");
require("dotenv").config();
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "baidu/qianfan-ocr-fast:free",
    //google/gemma-3-12b-it:free
    messages: [{ role: "user", content: "what is agentic AI?" }],
  });

  console.log(completion.choices[0].message.content);
}
//main();

const analyzeGoal = async (goalText, durationDays) => {
  // const goalText = "Learn Python";
  // const durationDays = "7";

  const prompt = `User wants to ${goalText} within ${durationDays} days. 
    create a structured learning/execution plan with:
    1. main milestones for each week.
    2. success matrices
    3. potential challenges
    4. motivational approch

    Return as JSON with this structure:
    {
      "milestones": ["milestone1", "milestone2", "milestone3"],
      "dailyTasks": [{"day": 1, "title": "....", "description": "..."}],
      "successMetrics": ["metric 1", "metric 2", "metric 3"],
      "challenges": ["challenge 1"],
      "motivationalApproach": "...."
    } 
  `;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      // "google/gemma-3-12b-it:free",
      // "baidu/qianfan-ocr-fast:free",
      messages: [
        {
          role: "system",
          content:
            "You are an web dev specialist and teach development to students specially in python",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Model did not return valid JSON");
    }
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
    throw err;
  }
};
const evaluateProgress = async (goal, completedTasks, totalTasks, days) => {
  const completionRate = ((completedTasks / totalTasks) * 100).toFixed(2); // 72
  const expectedRate = ((days / goal.durationDays) * 100).toFixed(2); // 90
  const onTrack = completionRate >= expectedRate - 10;

  const prompt = `Learning Goal: "${goal.title}"
  Duration: "${goal.durationDays}"
  Days Elapsed: ${days} days
  Task Completion Rate: ${completionRate}  
  Expected Task completion rate: ${expectedRate}
  status: ${onTrack ? "ON TRACK" : "BEHIND"}

  Generate: 
  1. Performance analysis
  2. Specific encouragement 
  3. Recommend next action (just 1-3 lines)
  4. Weekly tips

  Return as JSON: 
  {
    "analysis": ".....",
    "encourgement": ".....",
    "nextAction": ".....",
    "tip": "....."
  }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a supportive and smart productivity coach. Be encouraging but honest. Adapt your tone based on progress.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Model did not return valid JSON");
    }
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = {
  analyzeGoal,
  evaluateProgress,
};
// analyzeGoal();
