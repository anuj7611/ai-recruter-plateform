import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { geminiModel } from "../../services/ai/gemini.client.js";

import { resumeAnalysisSchema } from "./resume.analysis.schema.js";

import type { ResumeAnalysis } from "./resume.analysis.schema.js";

export const analyzeResumeText = async (
  resumeText: string,
): Promise<ResumeAnalysis> => {
  /*
   * LangChain wraps Gemini with
   * structured output validation.
   */
  const structuredModel =
    geminiModel.withStructuredOutput(resumeAnalysisSchema);

  const result = await structuredModel.invoke([
    new SystemMessage(
      `
You are an expert resume information extraction system.

Your job is to extract accurate structured information from a candidate's resume.

RULES:

1. Use ONLY information present in the resume.

2. Never invent:
   - skills
   - companies
   - job titles
   - dates
   - projects
   - education
   - achievements

3. If information is missing, return null where the schema allows it.

4. Do not assume years of experience unless the resume contains enough information to calculate it.

5. Deduplicate repeated skills.

6. Extract technical skills separately and accurately.

7. For current employment:
   isCurrent = true
   endDate = null

8. Convert dates to YYYY-MM-DD when possible.

9. If only month and year are available,
   use the first day of that month.

10. If only year is available,
    use January 1 of that year.

11. Preserve measurable achievements.

12. Extract technologies used in each project.

13. Extract technologies used in each work experience.

14. Keep descriptions concise and factual.

15. Do not add knowledge that is not supported by the resume.
        `.trim(),
    ),

    new HumanMessage(
      `
Analyze the following candidate resume.

================ RESUME ================

${resumeText}

============== END RESUME ==============
        `.trim(),
    ),
  ]);

  return result;
};
