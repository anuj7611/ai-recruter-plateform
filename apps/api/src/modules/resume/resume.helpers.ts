export const normalizeSkillName = (skill: string): string => {
  return skill
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ");
};

export const parseResumeDate = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

export const clampConfidence = (value: number | null): number | null => {
  if (value === null) {
    return null;
  }

  return Math.min(1, Math.max(0, value));
};
