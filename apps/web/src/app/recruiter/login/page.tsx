import { PortalLoginForm } from "@/components/auth/portal-login-form";

export default function RecruiterLoginPage() {
  return (
    <PortalLoginForm
      role="RECRUITER"
      eyebrow="Recruiter portal"
      title="Sign in to your hiring workspace"
      description="Manage interviews, candidates, and hiring decisions from one place."
      registerHref="/recruiter/register"
      registerLabel="Register as a recruiter"
    />
  );
}
