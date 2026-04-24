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

const analyzeGoal = async () => {
  const goalText = "Learn Python";
  const durationDays = "7";

  const propmt = `I want to ${goalText} within ${durationDays}, crate a clear structure for me`;
  try {
    const completion = await openai.chat.completions.create({
      model: "baidu/qianfan-ocr-fast:free",
      //google/gemma-3-12b-it:free
      messages: [
        { role : "system", content : "You are an web dev specialist and teach development to students specially in python" },
        { role: "user", content: propmt }],
        temperature : 0.7,
    });

    console.log(completion.choices[0].message.content);
  } catch (err) {
    console.error(err);
  }
};

analyzeGoal();
