export type JobStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
export type InterviewStatus =
  | "CREATED"
  | "READY"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "FAILED";

export interface CandidateProfileDetails {
  id: string;
  headline: string | null;
  bio: string | null;
  currentRole: string | null;
  targetRole: string | null;
  experienceYears: number;
  experienceLevel: string | null;
  location: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
}

export interface CandidateProfileResponse {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  candidateProfile: CandidateProfileDetails;
}

export interface Resume {
  id: string;
  title: string | null;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  status: string;
  isPrimary: boolean;
  uploadedAt: string | null;
  parsedAt: string | null;
  analyzedAt: string | null;
  embeddedAt: string | null;
  processingError: string | null;
  failureStage: string | null;
  createdAt: string;
  updatedAt: string;
  skills?: Array<{ id: string; name: string; category: string | null }>;
  experiences?: Array<Record<string, unknown>>;
  educations?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
}

export interface CandidateInterview {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  status: InterviewStatus;
  durationMinutes: number;
  questionCount: number;
  currentQuestionIndex: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  overallScore: number | null;
  job?: {
    id?: string;
    title: string;
    department?: string | null;
    location?: string | null;
    employmentType?: string | null;
  } | null;
  requiresInvitation?: boolean;
  invitation?: { status: string; expiresAt: string } | null;
}

export interface CandidateQuestion {
  id: string;
  number: number;
  order: number;
  question: string;
  type: string;
  difficulty: string;
  section: string | null;
  isFollowUp?: boolean;
}

export interface InterviewResult {
  id: string;
  title: string;
  type?: string;
  difficulty?: string;
  overallScore: number | null;
  finalFeedback: string | null;
  evaluationData: Record<string, unknown> | null;
  completedAt: string | null;
  job?: { title: string } | null;
}

export interface JobOpening {
  id: string;
  title: string;
  description?: string;
  department: string | null;
  location: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  minExperienceYears: number | null;
  maxExperienceYears: number | null;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { interviews: number; applications?: number };
}

export type JobApplicationStatus =
  | "APPLIED"
  | "UNDER_REVIEW"
  | "INTERVIEW_CREATED"
  | "REJECTED"
  | "WITHDRAWN";

export interface CandidateJob extends JobOpening {
  createdBy: { name: string };
  applications: Array<{
    id: string;
    status: JobApplicationStatus;
    appliedAt: string;
    resumeId?: string;
    interview: { id: string; status: InterviewStatus } | null;
  }>;
}

export interface JobApplication {
  id: string;
  status: JobApplicationStatus;
  coverLetter: string | null;
  appliedAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
    department?: string | null;
    location?: string | null;
    employmentType?: string | null;
    status: JobStatus;
  };
  candidateProfile?: {
    id: string;
    headline: string | null;
    experienceYears: number;
    experienceLevel: string | null;
    location: string | null;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
    };
  };
  resume: {
    id: string;
    title: string | null;
    originalFileName: string;
    status?: string;
    storageUrl?: string | null;
    skills?: Array<{ id: string; name: string; category: string | null }>;
  };
  interview: {
    id: string;
    title: string;
    status: InterviewStatus;
    scheduledAt: string | null;
  } | null;
}

export interface InterviewTemplate {
  id: string;
  name: string;
  description: string | null;
  type: string;
  difficulty: string;
  durationMinutes: number;
  questionCount: number;
  includeResumeQuestions: boolean;
  includeJobQuestions: boolean;
  includeCodingQuestions: boolean;
  adaptiveFollowUpsEnabled?: boolean;
  maxFollowUpQuestions?: number;
  systemPrompt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { interviews: number };
}

export interface RecruiterInterview extends CandidateInterview {
  candidateProfile?: {
    id: string;
    headline?: string | null;
    bio?: string | null;
    currentRole?: string | null;
    targetRole?: string | null;
    experienceYears?: number;
    experienceLevel?: string | null;
    location?: string | null;
    linkedinUrl?: string | null;
    githubUrl?: string | null;
    portfolioUrl?: string | null;
    user: {
      id?: string;
      name: string;
      email: string;
      avatarUrl?: string | null;
    };
  };
  resume?: {
    id: string;
    title: string | null;
    originalFileName?: string;
    status?: string;
    storageUrl?: string | null;
    skills?: Array<{
      id: string;
      name: string;
      category: string | null;
      yearsExperience: number | null;
    }>;
  } | null;
  template?: { id: string; name: string } | null;
  questions?: Array<{
    id: string;
    order: number;
    question: string;
    type: string;
    difficulty: string;
    answer?: { score: number | null; answerText: string | null } | null;
  }>;
  invitations?: Array<{ id: string; email: string; status: string; expiresAt: string }>;
}

export interface NotificationItem {
  id: string;
  type: string;
  status: string;
  subject: string;
  sentAt: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}
