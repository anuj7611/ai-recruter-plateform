import { PortalLoginForm } from "@/components/auth/portal-login-form";

export default function SuperAdminLoginPage() {
  return (
    <PortalLoginForm
      role="SUPER_ADMIN"
      eyebrow="Platform administration"
      title="Sign in to the super-admin portal"
      description="Manage platform access and organization administrators securely."
    />
  );
}
