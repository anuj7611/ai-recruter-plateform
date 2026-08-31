import { prisma } from "../../lib/prisma.js";

const QUALIFICATION_THRESHOLD = 65;

const countBy = <T extends string>(
  rows: Array<{ _count: number; value: T }>,
) =>
  Object.fromEntries(rows.map((row) => [row.value, row._count])) as Record<
    T,
    number
  >;

const getPlatformSummary = async () => {
  const now = new Date();

  const [
    totalUsers,
    activeUsers,
    verifiedUsers,
    usersByRoleRows,
    usersByStatusRows,
    totalJobs,
    activeJobs,
    totalApplications,
    totalInterviews,
    completedInterviews,
    failedInterviews,
    qualifiedCandidates,
    totalResumes,
    failedResumes,
    activeSessions,
    pendingInvitations,
    notificationsByStatusRows,
    recentUsers,
    recentInterviews,
    recentNotifications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
    prisma.user.groupBy({ by: ["role"], _count: true }),
    prisma.user.groupBy({ by: ["status"], _count: true }),
    prisma.jobOpening.count(),
    prisma.jobOpening.count({ where: { status: "ACTIVE" } }),
    prisma.jobApplication.count(),
    prisma.interview.count(),
    prisma.interview.count({ where: { status: "COMPLETED" } }),
    prisma.interview.count({ where: { status: "FAILED" } }),
    prisma.interview.count({
      where: {
        status: "COMPLETED",
        overallScore: { gt: QUALIFICATION_THRESHOLD },
      },
    }),
    prisma.resume.count(),
    prisma.resume.count({ where: { status: "FAILED" } }),
    prisma.session.count({ where: { status: "ACTIVE", expiresAt: { gt: now } } }),
    prisma.accountInvitation.count({
      where: { acceptedAt: null, expiresAt: { gt: now } },
    }),
    prisma.notification.groupBy({ by: ["status"], _count: true }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.interview.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        status: true,
        overallScore: true,
        createdAt: true,
        candidateProfile: { select: { user: { select: { name: true } } } },
        createdBy: { select: { name: true } },
        job: { select: { title: true } },
      },
    }),
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        type: true,
        status: true,
        subject: true,
        recipientEmail: true,
        createdAt: true,
      },
    }),
  ]);

  const usersByRole = countBy(
    usersByRoleRows.map((row) => ({ value: row.role, _count: row._count })),
  );
  const usersByStatus = countBy(
    usersByStatusRows.map((row) => ({ value: row.status, _count: row._count })),
  );
  const notificationsByStatus = countBy(
    notificationsByStatusRows.map((row) => ({
      value: row.status,
      _count: row._count,
    })),
  );

  return {
    scope: "platform" as const,
    generatedAt: now,
    qualificationThreshold: QUALIFICATION_THRESHOLD,
    metrics: {
      totalUsers,
      activeUsers,
      verifiedUsers,
      totalJobs,
      activeJobs,
      totalApplications,
      totalInterviews,
      completedInterviews,
      qualifiedCandidates,
    },
    usersByRole,
    usersByStatus,
    hiring: {
      totalResumes,
      failedResumes,
      failedInterviews,
    },
    operations: {
      activeSessions,
      pendingInvitations,
      notificationsByStatus,
    },
    recentUsers,
    recentInterviews,
    recentNotifications,
  };
};

const getOrganizationSummary = async (adminId: string) => {
  const now = new Date();
  const invitations = await prisma.accountInvitation.findMany({
    where: { invitedById: adminId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      acceptedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const acceptedRecruiterEmails = invitations
    .filter(
      (invitation) =>
        invitation.role === "RECRUITER" && invitation.acceptedAt !== null,
    )
    .map((invitation) => invitation.email);

  const teamMembers = acceptedRecruiterEmails.length
    ? await prisma.user.findMany({
        where: {
          role: "RECRUITER",
          email: { in: acceptedRecruiterEmails },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          recruiterProfile: {
            select: { jobTitle: true, department: true },
          },
        },
      })
    : [];

  const ownerIds = [adminId, ...teamMembers.map((member) => member.id)];
  const jobScope = { createdById: { in: ownerIds } } as const;
  const interviewScope = { createdById: { in: ownerIds } } as const;

  const [
    totalJobs,
    activeJobs,
    totalApplications,
    totalInterviews,
    activeInterviews,
    completedInterviews,
    qualifiedCandidates,
    scoreAggregate,
    activeTeamSessions,
    recentJobs,
    recentInterviews,
  ] = await Promise.all([
    prisma.jobOpening.count({ where: jobScope }),
    prisma.jobOpening.count({ where: { ...jobScope, status: "ACTIVE" } }),
    prisma.jobApplication.count({ where: { job: jobScope } }),
    prisma.interview.count({ where: interviewScope }),
    prisma.interview.count({
      where: {
        ...interviewScope,
        status: { in: ["READY", "SCHEDULED", "IN_PROGRESS"] },
      },
    }),
    prisma.interview.count({
      where: { ...interviewScope, status: "COMPLETED" },
    }),
    prisma.interview.count({
      where: {
        ...interviewScope,
        status: "COMPLETED",
        overallScore: { gt: QUALIFICATION_THRESHOLD },
      },
    }),
    prisma.interview.aggregate({
      where: { ...interviewScope, status: "COMPLETED" },
      _avg: { overallScore: true },
    }),
    prisma.session.count({
      where: {
        userId: { in: teamMembers.map((member) => member.id) },
        status: "ACTIVE",
        expiresAt: { gt: now },
      },
    }),
    prisma.jobOpening.findMany({
      where: jobScope,
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        status: true,
        department: true,
        location: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        _count: { select: { applications: true, interviews: true } },
      },
    }),
    prisma.interview.findMany({
      where: interviewScope,
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        status: true,
        overallScore: true,
        scheduledAt: true,
        createdAt: true,
        candidateProfile: { select: { user: { select: { name: true } } } },
        createdBy: { select: { name: true } },
        job: { select: { title: true } },
      },
    }),
  ]);

  const invitationActivity = invitations.slice(0, 8).map((invitation) => ({
    ...invitation,
    status: invitation.acceptedAt
      ? ("ACCEPTED" as const)
      : invitation.expiresAt <= now
        ? ("EXPIRED" as const)
        : ("PENDING" as const),
  }));

  return {
    scope: "organization" as const,
    generatedAt: now,
    qualificationThreshold: QUALIFICATION_THRESHOLD,
    metrics: {
      teamMembers: teamMembers.length,
      pendingInvitations: invitations.filter(
        (invitation) =>
          invitation.acceptedAt === null && invitation.expiresAt > now,
      ).length,
      totalJobs,
      activeJobs,
      totalApplications,
      totalInterviews,
      activeInterviews,
      completedInterviews,
      qualifiedCandidates,
      averageScore: Number((scoreAggregate._avg.overallScore ?? 0).toFixed(1)),
    },
    operations: { activeTeamSessions },
    teamMembers,
    invitationActivity,
    recentJobs,
    recentInterviews,
  };
};

export const getAdminDashboardSummary = async (
  userId: string,
  role: "ORGANIZATION_ADMIN" | "SUPER_ADMIN",
) =>
  role === "SUPER_ADMIN"
    ? getPlatformSummary()
    : getOrganizationSummary(userId);
