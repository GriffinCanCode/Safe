/**
 * @fileoverview Admin Service
 * @description Service for interacting with admin analytics and monitoring functions
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

const functions = getFunctions();

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  userGrowthRate: number;
  averageSessionDuration: number;
  topUserCountries: Record<string, number>;
  userRetentionRates: {
    day1: number;
    day7: number;
    day30: number;
  };
  featureUsage: Record<string, number>;
  storageUsage: {
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    topFileTypes: Record<string, number>;
  };
}

export interface UserSegmentation {
  powerUsers: {
    count: number;
    percentage: number;
    definition: string;
  };
  regularUsers: {
    count: number;
    percentage: number;
    definition: string;
  };
  lightUsers: {
    count: number;
    percentage: number;
    definition: string;
  };
  inactiveUsers: {
    count: number;
    percentage: number;
    definition: string;
  };
  newUsers: {
    count: number;
    percentage: number;
    definition: string;
  };
}

export interface ActivityTrend {
  timestamp: string;
  activeUsers: number;
  newUsers: number;
  sessions: number;
  fileUploads: number;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  responseTime: number;
  errorRate: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  lastChecked: string;
  alerts: Array<{
    type: 'warning' | 'critical';
    message: string;
    timestamp: string;
  }>;
}

export class AdminService {
  private static instance: AdminService;

  private constructor() {}

  public static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  /**
   * Check if current user is an admin
   */
  async isAdmin(): Promise<boolean> {
    try {
      const auth = getAuth();
      if (!auth.currentUser) return false;

      // This would typically check a custom claim or make a call to verify admin status
      const token = await auth.currentUser.getIdTokenResult();
      return token.claims.isAdmin === true;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Generate comprehensive user analytics report
   */
  async generateUserAnalytics(dateRange: number = 30): Promise<UserAnalytics> {
    const generateAnalytics = httpsCallable(functions, 'generateUserAnalytics');

    try {
      const result = await generateAnalytics({ dateRange });

      if (result.data && (result.data as any).success) {
        return (result.data as any).analytics;
      }

      throw new Error('Failed to generate analytics');
    } catch (error) {
      console.error('Error generating user analytics:', error);
      throw error;
    }
  }

  /**
   * Get user activity trends over time
   */
  async getUserActivityTrends(
    period: '24h' | '7d' | '30d' | '90d' = '7d',
    granularity: 'hour' | 'day' | 'week' = 'day'
  ): Promise<ActivityTrend[]> {
    const getTrends = httpsCallable(functions, 'getUserActivityTrends');

    try {
      const result = await getTrends({ period, granularity });

      if (result.data && (result.data as any).success) {
        return (result.data as any).trends;
      }

      throw new Error('Failed to get activity trends');
    } catch (error) {
      console.error('Error getting activity trends:', error);
      throw error;
    }
  }

  /**
   * Get user segmentation data
   */
  async getUserSegmentation(): Promise<{
    segmentation: UserSegmentation;
    totalUsers: number;
  }> {
    const getSegmentation = httpsCallable(functions, 'getUserSegmentation');

    try {
      const result = await getSegmentation();

      if (result.data && (result.data as any).success) {
        return {
          segmentation: (result.data as any).segmentation,
          totalUsers: (result.data as any).totalUsers,
        };
      }

      throw new Error('Failed to get user segmentation');
    } catch (error) {
      console.error('Error getting user segmentation:', error);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const getHealth = httpsCallable(functions, 'getSystemHealth');

    try {
      const result = await getHealth();

      if (result.data && (result.data as any).success) {
        return (result.data as any).health;
      }

      throw new Error('Failed to get system health');
    } catch (error) {
      console.error('Error getting system health:', error);
      throw error;
    }
  }

  /**
   * Run system health check
   */
  async runSystemHealthCheck(): Promise<SystemHealth> {
    const runHealthCheck = httpsCallable(functions, 'runSystemHealthCheck');

    try {
      const result = await runHealthCheck();

      if (result.data && (result.data as any).success) {
        return (result.data as any).health;
      }

      throw new Error('Failed to run health check');
    } catch (error) {
      console.error('Error running health check:', error);
      throw error;
    }
  }

  /**
   * Purge inactive users
   */
  async purgeInactiveUsers(daysSinceLastLogin: number = 365): Promise<{ purgedCount: number }> {
    const purgeUsers = httpsCallable(functions, 'purgeInactiveUsers');

    try {
      const result = await purgeUsers({ daysSinceLastLogin });

      if (result.data && (result.data as any).success) {
        return { purgedCount: (result.data as any).purgedCount };
      }

      throw new Error('Failed to purge inactive users');
    } catch (error) {
      console.error('Error purging inactive users:', error);
      throw error;
    }
  }

  /**
   * Optimize system performance
   */
  async optimizeSystem(): Promise<{ optimizationsApplied: string[] }> {
    const optimizeSystem = httpsCallable(functions, 'optimizeSystem');

    try {
      const result = await optimizeSystem();

      if (result.data && (result.data as any).success) {
        return {
          optimizationsApplied: (result.data as any).optimizationsApplied,
        };
      }

      throw new Error('Failed to optimize system');
    } catch (error) {
      console.error('Error optimizing system:', error);
      throw error;
    }
  }

  /**
   * Get security incidents
   */
  async getSecurityIncidents(limit: number = 50): Promise<any[]> {
    // This would be implemented when security incident functions are available
    // For now, return mock data
    return [];
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Format number with thousand separators
   */
  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }
}
