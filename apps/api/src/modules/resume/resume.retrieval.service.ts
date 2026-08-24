import { embedQuery } from "../../services/ai/embedding.service.js";
import { searchResumeVectors } from "../../services/vector/resume-vector.service.js";

export const retrieveResumeContext = async (
  resumeId: string,
  query: string,
  limit = 5,
) => {
  const queryVector = await embedQuery(query);

  const results = await searchResumeVectors(resumeId, queryVector, limit);

  return results;
};
