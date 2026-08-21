import { PortalLoginForm } from "@/components/auth/portal-login-form";

export default function OrganizationAdminLoginPage() {
  return (
    <PortalLoginForm
      role="ORGANIZATION_ADMIN"
      eyebrow="Organization administration"
      title="Sign in to manage your organization"
      description="Control recruiter access, invitations, and organization settings."
    />
  );
}
