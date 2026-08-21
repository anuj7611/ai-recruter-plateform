import { resend } from "./resend.js";

interface SendVerificationEmailInput {
  email: string;
  name: string;
  verificationToken: string;
}

interface SendPasswordResetEmailInput {
  email: string;
  name: string;
  resetToken: string;
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );

export const sendVerificationEmail = async ({
  email,
  name,
  verificationToken,
}: SendVerificationEmailInput) => {
  const from = process.env.EMAIL_FROM;

  const webUrl = process.env.WEB_URL;

  if (!from) {
    throw new Error("EMAIL_FROM is not defined");
  }

  if (!webUrl) {
    throw new Error("WEB_URL is not defined");
  }

  const verificationUrl = `${webUrl}/verify-email?token=${encodeURIComponent(
    verificationToken,
  )}`;

  const { data, error } = await resend.emails.send({
    from,

    to: email,

    subject: "Verify your AI Interview account",

    html: `
          <div
            style="
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 32px;
            "
          >
            <h1>
              Verify your email
            </h1>

            <p>
              Hi ${escapeHtml(name)},
            </p>

            <p>
              Thanks for creating your
              AI Interview account.
            </p>

            <p>
              Click the button below
              to verify your email.
            </p>

            <a
              href="${verificationUrl}"
              style="
                display: inline-block;
                padding: 12px 20px;
                background: #111827;
                color: white;
                text-decoration: none;
                border-radius: 8px;
              "
            >
              Verify Email
            </a>

            <p
              style="
                margin-top: 24px;
                font-size: 13px;
                color: #6b7280;
              "
            >
              If you did not create
              this account, you can
              ignore this email.
            </p>
          </div>
        `,
  });

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }

  return data;
};

export const sendPasswordResetEmail = async ({
  email,
  name,
  resetToken,
}: SendPasswordResetEmailInput) => {
  const from = process.env.EMAIL_FROM;
  const webUrl = process.env.WEB_URL;

  if (!from) throw new Error("EMAIL_FROM is not defined");
  if (!webUrl) throw new Error("WEB_URL is not defined");

  const resetUrl = `${webUrl}/reset-password?token=${encodeURIComponent(
    resetToken,
  )}`;

  const { data, error } = await resend.emails.send({
    from,
    to: email,
    subject: "Reset your AI Interview password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h1>Reset your password</h1>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Use the button below to choose a new password. This link expires in 30 minutes.</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 20px; background: #111827; color: white; text-decoration: none; border-radius: 8px;">
          Reset Password
        </a>
        <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">
          If you did not request a password reset, you can ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }

  return data;
};
