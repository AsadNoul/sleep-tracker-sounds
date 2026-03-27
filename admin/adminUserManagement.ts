/**
 * Admin User Management
 * Control user data and features
 */

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  joinDate: Date;
  lastActive: Date;
  totalSessions: number;
  isPremium: boolean;
  isActive: boolean;
  accountStatus: 'active' | 'suspended' | 'deleted';
}

export interface AdminAction {
  id: string;
  userId: string;
  action: 'suspend' | 'unsuspend' | 'delete' | 'export' | 'reset' | 'promote';
  reason: string;
  timestamp: Date;
  performedBy: string;
}

/**
 * Export user data
 */
export function exportUserData(userId: string): string {
  const exportData = {
    userId,
    exportDate: new Date().toISOString(),
    sleepSessions: [],
    moods: [],
    dreams: [],
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Delete user account
 */
export function deleteUserAccount(userId: string): AdminAction {
  return {
    id: `action-${Date.now()}`,
    userId,
    action: 'delete',
    reason: 'User requested account deletion',
    timestamp: new Date(),
    performedBy: 'admin',
  };
}

/**
 * Suspend user
 */
export function suspendUser(userId: string, reason: string): AdminAction {
  return {
    id: `action-${Date.now()}`,
    userId,
    action: 'suspend',
    reason,
    timestamp: new Date(),
    performedBy: 'admin',
  };
}

/**
 * Reset user data
 */
export function resetUserData(userId: string): AdminAction {
  return {
    id: `action-${Date.now()}`,
    userId,
    action: 'reset',
    reason: 'Admin reset user data',
    timestamp: new Date(),
    performedBy: 'admin',
  };
}

/**
 * Send bulk message to users
 */
export interface BulkMessage {
  id: string;
  title: string;
  content: string;
  targetAudience: 'all' | 'active' | 'inactive' | 'premium' | 'free';
  scheduledFor: Date;
  createdAt: Date;
  sentCount: number;
  failedCount: number;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
}

export function createBulkMessage(
  title: string,
  content: string,
  audience: string
): BulkMessage {
  return {
    id: `msg-${Date.now()}`,
    title,
    content,
    targetAudience: audience as any,
    scheduledFor: new Date(),
    createdAt: new Date(),
    sentCount: 0,
    failedCount: 0,
    status: 'draft',
  };
}

/**
 * User behavior analysis
 */
export interface UserBehavior {
  userId: string;
  averageDailyLogins: number;
  mostActiveHour: number;
  preferredFont: string;
  screenTimeMinutes: number;
  featurePreferences: string[];
  churnRisk: 'low' | 'medium' | 'high';
}

export function analyzeUserBehavior(
  userId: string,
  sessionCount: number
): UserBehavior {
  const churnRisk = sessionCount < 5 ? 'high' : sessionCount < 15 ? 'medium' : 'low';

  return {
    userId,
    averageDailyLogins: sessionCount / 30,
    mostActiveHour: Math.floor(Math.random() * 24),
    preferredFont: 'System',
    screenTimeMinutes: sessionCount * 8,
    featurePreferences: ['mood', 'insights', 'dreams'],
    churnRisk,
  };
}
