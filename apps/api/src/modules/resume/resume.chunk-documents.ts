interface Skill {
  id: string;
  name: string;
  category: string | null;
  yearsExperience: number | null;
}

interface Experience {
  id: string;

  company: string;
  role: string;

  location: string | null;

  employmentType: string | null;

  startDate: Date | null;
  endDate: Date | null;

  isCurrent: boolean;

  description: string | null;

  achievements: string[];

  technologies: string[];
}

interface Education {
  id: string;

  institution: string;

  degree: string | null;
  field: string | null;

  location: string | null;

  startDate: Date | null;
  endDate: Date | null;

  grade: string | null;

  description: string | null;
}

interface Project {
  id: string;

  name: string;

  role: string | null;

  description: string | null;

  projectUrl: string | null;

  repositoryUrl: string | null;

  technologies: string[];

  startDate: Date | null;
  endDate: Date | null;
}

interface ResumeForChunking {
  id: string;

  candidateProfileId: string;

  skills: Skill[];

  experiences: Experience[];

  educations: Education[];

  projects: Project[];
}

interface ChunkDocument {
  section:
    | "SUMMARY"
    | "SKILLS"
    | "EXPERIENCE"
    | "EDUCATION"
    | "PROJECTS"
    | "OTHER";

  text: string;

  metadata: Record<string, string | number | boolean | null>;
}

const formatDate = (date: Date | null): string => {
  if (!date) {
    return "Unknown";
  }

  return date.toISOString().slice(0, 10);
};

export const buildResumeChunkDocuments = (
  resume: ResumeForChunking,
): ChunkDocument[] => {
  const documents: ChunkDocument[] = [];

  // =================================
  // Skills
  // =================================

  if (resume.skills.length) {
    const skillText = resume.skills
      .map((skill) => {
        const parts = [`Skill: ${skill.name}`];

        if (skill.category) {
          parts.push(`Category: ${skill.category}`);
        }

        if (skill.yearsExperience !== null) {
          parts.push(`Experience: ${skill.yearsExperience} years`);
        }

        return parts.join(" | ");
      })
      .join("\n");

    documents.push({
      section: "SKILLS",

      text: `Candidate Skills\n\n${skillText}`,

      metadata: {
        resumeId: resume.id,

        candidateProfileId: resume.candidateProfileId,

        sourceType: "skills",
      },
    });
  }

  // =================================
  // Experience
  // =================================

  for (const experience of resume.experiences) {
    const lines = [
      `Role: ${experience.role}`,

      `Company: ${experience.company}`,
    ];

    if (experience.employmentType) {
      lines.push(`Employment Type: ${experience.employmentType}`);
    }

    if (experience.location) {
      lines.push(`Location: ${experience.location}`);
    }

    lines.push(`Start Date: ${formatDate(experience.startDate)}`);

    lines.push(
      `End Date: ${
        experience.isCurrent ? "Present" : formatDate(experience.endDate)
      }`,
    );

    if (experience.description) {
      lines.push(`Description: ${experience.description}`);
    }

    if (experience.achievements.length) {
      lines.push(
        `Achievements:\n${experience.achievements
          .map((achievement) => `- ${achievement}`)
          .join("\n")}`,
      );
    }

    if (experience.technologies.length) {
      lines.push(`Technologies: ${experience.technologies.join(", ")}`);
    }

    documents.push({
      section: "EXPERIENCE",

      text: lines.join("\n"),

      metadata: {
        resumeId: resume.id,

        candidateProfileId: resume.candidateProfileId,

        sourceType: "experience",

        sourceId: experience.id,

        company: experience.company,

        role: experience.role,
      },
    });
  }

  // =================================
  // Education
  // =================================

  for (const education of resume.educations) {
    const lines = [`Institution: ${education.institution}`];

    if (education.degree) {
      lines.push(`Degree: ${education.degree}`);
    }

    if (education.field) {
      lines.push(`Field: ${education.field}`);
    }

    if (education.location) {
      lines.push(`Location: ${education.location}`);
    }

    lines.push(`Start Date: ${formatDate(education.startDate)}`);

    lines.push(`End Date: ${formatDate(education.endDate)}`);

    if (education.grade) {
      lines.push(`Grade: ${education.grade}`);
    }

    if (education.description) {
      lines.push(`Description: ${education.description}`);
    }

    documents.push({
      section: "EDUCATION",

      text: lines.join("\n"),

      metadata: {
        resumeId: resume.id,

        candidateProfileId: resume.candidateProfileId,

        sourceType: "education",

        sourceId: education.id,

        institution: education.institution,
      },
    });
  }

  // =================================
  // Projects
  // =================================

  for (const project of resume.projects) {
    const lines = [`Project: ${project.name}`];

    if (project.role) {
      lines.push(`Role: ${project.role}`);
    }

    if (project.description) {
      lines.push(`Description: ${project.description}`);
    }

    if (project.technologies.length) {
      lines.push(`Technologies: ${project.technologies.join(", ")}`);
    }

    if (project.projectUrl) {
      lines.push(`Project URL: ${project.projectUrl}`);
    }

    if (project.repositoryUrl) {
      lines.push(`Repository: ${project.repositoryUrl}`);
    }

    if (project.startDate) {
      lines.push(`Start Date: ${formatDate(project.startDate)}`);
    }

    if (project.endDate) {
      lines.push(`End Date: ${formatDate(project.endDate)}`);
    }

    documents.push({
      section: "PROJECTS",

      text: lines.join("\n"),

      metadata: {
        resumeId: resume.id,

        candidateProfileId: resume.candidateProfileId,

        sourceType: "project",

        sourceId: project.id,

        projectName: project.name,
      },
    });
  }

  return documents;
};
