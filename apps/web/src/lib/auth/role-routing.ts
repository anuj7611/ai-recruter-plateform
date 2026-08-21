import type { UserRole } from "./types";

export const getRoleHome = (role: UserRole) => {
  switch (role) {
    case "RECRUITER":
      return "/recruiter";
    case "ORGANIZATION_ADMIN":
      return "/organization";
    case "SUPER_ADMIN":
      return "/admin";
    default:
      return "/dashboard";
  }
};

export const getRoleLabel = (role: UserRole) =>
  role.replaceAll("_", " ").toLowerCase();
