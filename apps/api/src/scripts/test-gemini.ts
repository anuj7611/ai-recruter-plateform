import "dotenv/config";

import { geminiModel } from "../services/ai/gemini.client.js";

const run = async () => {
  const response = await geminiModel.invoke(
    "Reply only with: Gemini is connected",
  );

  console.log(response.text);
};

run().catch(console.error);
