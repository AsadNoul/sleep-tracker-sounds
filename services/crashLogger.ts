/**
 * Lightweight Crash Logger
 * Sends crash reports to your email via Supabase Edge Function
 * NO EXTERNAL DEPENDENCIES - Uses only what's already installed
 */

import { supabase } from '../lib/supabase';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

interface CrashReport {
  error: string;
  errorStack?: string;
  componentStack?: string;
  userInfo?: {
    userId?: string;
    email?: string;
  };
  deviceInfo: {
    model: string;
    osName: string;
    osVersion: string;
    appVersion: string;
    buildVersion: string;
  };
  timestamp: string;
  severity: 'critical' | 'error' | 'warning';
}

class CrashLogger {
  private adminEmail = 'your-email@example.com'; // REPLACE WITH YOUR EMAIL
  private maxReportsPerSession = 5;
  private reportCount = 0;
  private isConfigured = false;

  /**
   * Configure the crash logger with your email
   */
  configure(adminEmail: string) {
    this.adminEmail = adminEmail;
    this.isConfigured = true;
    console.log('✅ Crash Logger configured');
  }

  /**
   * Capture and report a crash
   */
  async reportCrash(
    error: Error | unknown,
    severity: 'critical' | 'error' | 'warning' = 'error',
    componentStack?: string,
    userInfo?: { userId?: string; email?: string }
  ): Promise<void> {
    try {
      // Prevent spam - max 5 reports per session
      if (this.reportCount >= this.maxReportsPerSession) {
        console.warn('⚠️ Max crash reports reached for this session');
        return;
      }

      this.reportCount++;

      // Build crash report
      const report: CrashReport = {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        componentStack,
        userInfo,
        deviceInfo: await this.getDeviceInfo(),
        timestamp: new Date().toISOString(),
        severity,
      };

      console.error('💥 CRASH DETECTED:', report.error);

      // Send to Supabase Edge Function (which will email you)
      await this.sendToSupabase(report);

      // Also save to local database for later review
      await this.saveToDatabase(report);
    } catch (logError) {
      // If crash logging fails, at least log to console
      console.error('❌ Failed to report crash:', logError);
      console.error('Original error:', error);
    }
  }

  /**
   * Send crash report via Supabase Edge Function to your email
   */
  private async sendToSupabase(report: CrashReport): Promise<void> {
    try {
      if (!this.isConfigured) {
        console.warn('⚠️ Crash Logger not configured. Skipping email notification.');
        return;
      }

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email send timeout')), 10000)
      );

      const sendPromise = supabase.functions.invoke('send-crash-report', {
        body: {
          adminEmail: this.adminEmail,
          report,
        },
      });

      // Race between timeout and actual send
      const { data, error } = await Promise.race([sendPromise, timeoutPromise]) as any;

      if (error) {
        // Silently fail - email not configured, but crash is already logged to DB
        console.log('⚠️ Crash report email not sent (email service not configured)');
      } else if (data?.note) {
        // Email service not configured (returns success but with note)
        console.log('✅ Crash logged (email notifications disabled)');
      } else {
        console.log('✅ Crash report sent to email');
      }
    } catch (error) {
      // Silently fail - don't want crash logging to cause more crashes
      console.log('⚠️ Could not send crash email (not critical)');
    }
  }

  /**
   * Save crash report to Supabase database for review
   */
  private async saveToDatabase(report: CrashReport): Promise<void> {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database save timeout')), 10000)
      );

      const savePromise = supabase.from('crash_reports').insert({
        error_message: report.error,
        error_stack: report.errorStack,
        component_stack: report.componentStack,
        user_id: report.userInfo?.userId,
        user_email: report.userInfo?.email,
        device_model: report.deviceInfo.model,
        os_name: report.deviceInfo.osName,
        os_version: report.deviceInfo.osVersion,
        app_version: report.deviceInfo.appVersion,
        build_version: report.deviceInfo.buildVersion,
        severity: report.severity,
        timestamp: report.timestamp,
      });

      // Race between timeout and actual save
      const { error } = await Promise.race([savePromise, timeoutPromise]) as any;

      if (error) {
        console.error('Failed to save crash report to DB:', error);
      } else {
        console.log('✅ Crash report saved to database');
      }
    } catch (error) {
      console.error('Error saving crash report to DB:', error);
      // Don't throw
    }
  }

  /**
   * Get device and app information
   */
  private async getDeviceInfo() {
    return {
      model: Device.modelName || 'Unknown',
      osName: Device.osName || 'Unknown',
      osVersion: Device.osVersion || 'Unknown',
      appVersion: Application.nativeApplicationVersion || '1.0.0',
      buildVersion: Application.nativeBuildVersion || '1',
    };
  }

  /**
   * Test the crash logger
   */
  async testCrashReport(): Promise<void> {
    console.log('🧪 Testing crash logger...');
    await this.reportCrash(
      new Error('Test crash report from Sleep Tracker App'),
      'warning',
      'Test component stack',
      { userId: 'test-user', email: 'test@example.com' }
    );
  }
}

// Export singleton instance
export const crashLogger = new CrashLogger();

// Global error handler for uncaught errors
export const setupGlobalErrorHandlers = () => {
  try {
    // Check if ErrorUtils is available (React Native only)
    // @ts-ignore - ErrorUtils is a React Native global
    if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
      // @ts-ignore
      const originalErrorHandler = ErrorUtils.getGlobalHandler();

      // @ts-ignore
      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        console.error('🚨 GLOBAL ERROR CAUGHT:', error);

        // Report to crash logger (fire-and-forget to prevent blocking)
        // Don't await - let it run in background
        crashLogger.reportCrash(error, isFatal ? 'critical' : 'error')
          .catch((reportError) => {
            // Silently fail if crash reporting fails
            console.error('Failed to report crash from global handler:', reportError);
          });

        // IMPORTANT: Don't call original handler if it's fatal
        // This prevents potential infinite loops
        if (!isFatal && originalErrorHandler) {
          try {
            originalErrorHandler(error, isFatal);
          } catch (handlerError) {
            console.error('Original error handler failed:', handlerError);
          }
        } else if (isFatal) {
          // For fatal errors, just log - don't re-throw
          console.error('Fatal error detected. App may need restart.');
        }
      });

      console.log('✅ Global error handlers configured');
    } else {
      console.warn('⚠️ ErrorUtils not available (not in React Native environment)');
    }
  } catch (error) {
    console.error('Failed to setup global error handlers:', error);
  }
};
