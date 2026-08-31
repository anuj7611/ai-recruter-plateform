const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const baseTemplate = (
  title: string,
  body: string,
  action?: {
    label: string;
    url: string;
  },
) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f5f7fb;
    font-family:Arial,sans-serif;
    color:#111827;
  "
>
  <div
    style="
      max-width:620px;
      margin:40px auto;
      background:white;
      border-radius:16px;
      padding:32px;
    "
  >
    <h1
      style="
        margin-top:0;
        font-size:24px;
      "
    >
      ${escapeHtml(title)}
    </h1>

    ${body}

    ${
      action
        ? `
      <div style="margin-top:30px;">
        <a
          href="${action.url}"
          style="
            display:inline-block;
            background:#111827;
            color:white;
            text-decoration:none;
            padding:13px 22px;
            border-radius:10px;
            font-weight:600;
          "
        >
          ${escapeHtml(action.label)}
        </a>
      </div>
    `
        : ""
    }

    <p
      style="
        margin-top:34px;
        color:#6b7280;
        font-size:13px;
      "
    >
      AI Interview Platform
    </p>
  </div>
</body>
</html>
  `.trim();
};

export const interviewInvitationEmail = ({
  candidateName,
  interviewTitle,
  jobTitle,
  scheduledAt,
  invitationUrl,
}: {
  candidateName: string;
  interviewTitle: string;
  jobTitle: string | null;
  scheduledAt: Date | null;
  invitationUrl: string;
}) => {
  const scheduleText = scheduledAt
    ? scheduledAt.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "You can start whenever the interview becomes available.";

  return baseTemplate(
    "Interview Invitation",

    `
        <p>
          Hi ${escapeHtml(candidateName)},
        </p>

        <p>
          You have been invited to complete
          <strong>${escapeHtml(interviewTitle)}</strong>.
        </p>

        ${
          jobTitle
            ? `
          <p>
            Position:
            <strong>${escapeHtml(jobTitle)}</strong>
          </p>
        `
            : ""
        }

        <p>
          Scheduled:
          <strong>${escapeHtml(scheduleText)}</strong>
        </p>

        <p>
          Open the invitation below to review
          the interview details.
        </p>
      `,

    {
      label: "View Interview",

      url: invitationUrl,
    },
  );
};

export const interviewReminderEmail = ({
  candidateName,
  interviewTitle,
  jobTitle,
  scheduledAt,
  dashboardUrl,
}: {
  candidateName: string;
  interviewTitle: string;
  jobTitle: string | null;
  scheduledAt: Date;
  dashboardUrl: string;
}) => {
  return baseTemplate(
    "Interview Reminder",

    `
        <p>
          Hi ${escapeHtml(candidateName)},
        </p>

        <p>
          This is a reminder that your interview
          <strong>${escapeHtml(interviewTitle)}</strong>
          is coming up.
        </p>

        ${
          jobTitle
            ? `
          <p>
            Position:
            <strong>${escapeHtml(jobTitle)}</strong>
          </p>
        `
            : ""
        }

        <p>
          Scheduled:
          <strong>
            ${escapeHtml(
              scheduledAt.toLocaleString("en-IN", {
                dateStyle: "medium",

                timeStyle: "short",
              }),
            )}
          </strong>
        </p>
      `,

    {
      label: "Open Dashboard",

      url: dashboardUrl,
    },
  );
};

export const interviewCompletedEmail = ({
  candidateName,
  interviewTitle,
  resultUrl,
}: {
  candidateName: string;
  interviewTitle: string;
  resultUrl: string;
}) => {
  return baseTemplate(
    "Interview Completed",

    `
        <p>
          Hi ${escapeHtml(candidateName)},
        </p>

        <p>
          Your interview
          <strong>${escapeHtml(interviewTitle)}</strong>
          has been completed successfully.
        </p>

        <p>
          Your interview result and feedback are
          available from your dashboard.
        </p>
      `,

    {
      label: "View Result",

      url: resultUrl,
    },
  );
};

export const interviewResultReadyEmail = ({
  recruiterName,
  candidateName,
  interviewTitle,
  overallScore,
  resultUrl,
}: {
  recruiterName: string;
  candidateName: string;
  interviewTitle: string;
  overallScore: number;
  resultUrl: string;
}) => {
  return baseTemplate(
    "Interview Result Ready",

    `
        <p>
          Hi ${escapeHtml(recruiterName)},
        </p>

        <p>
          ${escapeHtml(candidateName)}
          has completed
          <strong>${escapeHtml(interviewTitle)}</strong>.
        </p>

        <p>
          Overall Score:
          <strong>${overallScore.toFixed(2)} / 100</strong>
        </p>

        <p>
          Open the interview result to review
          answers, AI evaluation and feedback.
        </p>
      `,

    {
      label: "View Interview Result",

      url: resultUrl,
    },
  );
};

export const jobAvailableEmail = ({
  candidateName,
  jobTitle,
  department,
  location,
  jobUrl,
}: {
  candidateName: string;
  jobTitle: string;
  department: string | null;
  location: string | null;
  jobUrl: string;
}) =>
  baseTemplate(
    "New Job Opportunity",
    `
      <p>Hi ${escapeHtml(candidateName)},</p>
      <p>A new role matching your career journey is now open:</p>
      <p style="font-size:18px;"><strong>${escapeHtml(jobTitle)}</strong></p>
      ${department ? `<p>Department: <strong>${escapeHtml(department)}</strong></p>` : ""}
      ${location ? `<p>Location: <strong>${escapeHtml(location)}</strong></p>` : ""}
      <p>Review the role details and apply with one of your processed resumes.</p>
    `,
    { label: "View Job", url: jobUrl },
  );

export const jobApplicationReceivedEmail = ({
  recruiterName,
  candidateName,
  jobTitle,
  resumeTitle,
  applicationUrl,
  resumeUrl,
}: {
  recruiterName: string;
  candidateName: string;
  jobTitle: string;
  resumeTitle: string;
  applicationUrl: string;
  resumeUrl: string | null;
}) =>
  baseTemplate(
    "New Job Application",
    `
      <p>Hi ${escapeHtml(recruiterName)},</p>
      <p><strong>${escapeHtml(candidateName)}</strong> applied for <strong>${escapeHtml(jobTitle)}</strong>.</p>
      <p>Submitted resume: <strong>${escapeHtml(resumeTitle)}</strong></p>
      ${
        resumeUrl
          ? `<p><a href="${resumeUrl}" style="color:#6d28d9;font-weight:600;">Open submitted resume</a></p>`
          : ""
      }
      <p>Review the application and create a structured AI interview when ready.</p>
    `,
    { label: "Review Application", url: applicationUrl },
  );

export const jobApplicationStatusEmail = ({
  candidateName,
  jobTitle,
  status,
  applicationsUrl,
}: {
  candidateName: string;
  jobTitle: string;
  status: string;
  applicationsUrl: string;
}) => {
  const statusLabel = status.replaceAll("_", " ").toLowerCase();

  return baseTemplate(
    "Application Update",
    `
      <p>Hi ${escapeHtml(candidateName)},</p>
      <p>Your application for <strong>${escapeHtml(jobTitle)}</strong> is now <strong>${escapeHtml(statusLabel)}</strong>.</p>
      <p>Open your applications workspace for the latest details.</p>
    `,
    { label: "View Applications", url: applicationsUrl },
  );
};

export const interviewNotSelectedEmail = ({
  candidateName,
  jobTitle,
  applicationsUrl,
}: {
  candidateName: string;
  jobTitle: string;
  applicationsUrl: string;
}) =>
  baseTemplate(
    "Application Update",
    `
      <p>Hi ${escapeHtml(candidateName)},</p>
      <p>Thank you for taking the time to interview for <strong>${escapeHtml(jobTitle)}</strong>.</p>
      <p>After reviewing your interview results, we will not be moving forward with your application for this role.</p>
      <p>We appreciate your interest and encourage you to explore future opportunities that match your experience.</p>
    `,
    { label: "View Applications", url: applicationsUrl },
  );
