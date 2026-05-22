import { User, Role } from '../types';

/**
 * Enterprise-grade Role-based Access Control (RBAC) Permission System for AltLeads Portal.
 * Handles role hierarchies and bypass logic for SUPER_ADMIN.
 */

// Define standard role hierarchy hierarchy order (higher value = more power)
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 4,
  [Role.ADMIN]: 3,
  [Role.DATA_TEAM]: 2,
  [Role.AGENT]: 1,
  [Role.PENDING]: 0,
};

/**
 * Checks if the actor's role meets the minimum required role.
 * Super Admins always satisfy any role requirement.
 */
export const hasRole = (user: User | null, requiredRole: Role): boolean => {
  if (!user) return false;
  // Super admins (by role or email) always pass any role check
  if (isSuperAdmin(user)) return true;
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole];
};

/**
 * Root admin emails that are always treated as SUPER_ADMIN
 * regardless of their database role value.
 */
const ROOT_ADMIN_EMAILS = ['admin@amplior.com', 'superadmin@amplior.com'];

/**
 * Checks if a user has Super Admin (Root/Developer) privileges.
 * Uses an email-based bypass as a safety net for cases where the
 * database role may not yet reflect SUPER_ADMIN (e.g. migration lag).
 */
export const isSuperAdmin = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === Role.SUPER_ADMIN || ROOT_ADMIN_EMAILS.includes(user.email);
};

/**
 * Checks if a user has Admin or higher privileges.
 */
export const isAdmin = (user: User | null): boolean => {
  if (!user) return false;
  return hasRole(user, Role.ADMIN);
};

/**
 * Checks if the user is authorized to view or manage user directory.
 */
export const canManageUsers = (user: User | null): boolean => {
  return isAdmin(user);
};

/**
 * Checks if the user is authorized to manage team configurations.
 */
export const canManageTeams = (user: User | null): boolean => {
  return isAdmin(user);
};

/**
 * Checks if the user is authorized to manage global AI Models.
 */
export const canManageModels = (user: User | null): boolean => {
  return isAdmin(user);
};

/**
 * Checks if the user is authorized to access developer options / database seeding.
 */
export const hasDeveloperAccess = (user: User | null): boolean => {
  return isSuperAdmin(user);
};

/**
 * Checks if the user is authorized to view system security audit logs.
 */
export const canViewAuditLogs = (user: User | null): boolean => {
  return isAdmin(user);
};

/**
 * Checks if the current logged-in user can delete a target user.
 * - SUPER_ADMIN can delete anyone except potentially a safety block, but bypasses normal constraints.
 * - ADMIN can delete Agent, Data Team, and Pending users, but NOT Admins or Super Admins.
 * - Others cannot delete anyone.
 */
export const canDeleteUser = (currentUser: User | null, targetUser: User | { id: string; role: Role } | null): boolean => {
  if (!currentUser || !targetUser) return false;

  // You cannot delete your own account (safety constraint), unless you are SUPER_ADMIN (unrestricted override)
  if (currentUser.id === targetUser.id) {
    return isSuperAdmin(currentUser);
  }

  // SUPER_ADMIN bypasses all deletion safeguards
  if (isSuperAdmin(currentUser)) return true;

  // Normal Admins can delete users strictly below their hierarchy level
  if (currentUser.role === Role.ADMIN) {
    const isTargetElevated = targetUser.role === Role.ADMIN || targetUser.role === Role.SUPER_ADMIN;
    return !isTargetElevated;
  }

  return false;
};

/**
 * Checks if the current logged-in user is allowed to assign a specific role.
 * - SUPER_ADMIN can assign any role including SUPER_ADMIN.
 * - ADMIN can assign ADMIN, AGENT, DATA_TEAM, but NOT SUPER_ADMIN.
 * - Normal users cannot assign roles.
 */
export const canAssignRole = (currentUser: User | null, targetRole: Role): boolean => {
  if (!currentUser) return false;

  // SUPER_ADMIN has full authority
  if (isSuperAdmin(currentUser)) return true;

  // ADMIN can assign roles up to ADMIN, but never SUPER_ADMIN
  if (currentUser.role === Role.ADMIN) {
    return targetRole !== Role.SUPER_ADMIN;
  }

  return false;
};

/**
 * Checks if the user is authorized to bypass self-edit constraints.
 * Allows changing their own role, team, or deactivating themselves.
 * - ONLY SUPER_ADMIN is allowed this root override.
 */
export const canBypassSelfEdit = (user: User | null): boolean => {
  return isSuperAdmin(user);
};
