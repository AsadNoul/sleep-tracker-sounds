// Production-ready logger utility
// Shows logs in DEV mode (emulator/device testing)
// Hides non-critical logs in production builds

const isDevelopment = __DEV__;

class Logger {
  /**
   * General logging - visible in DEV only
   */
  log(...args: any[]) {
    if (isDevelopment) {
      console.log(...args);
    }
  }

  /**
   * Info logging - visible in DEV only
   */
  info(message: string, data?: any) {
    if (isDevelopment) {
      console.log(`ℹ️ [INFO] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * Warning logging - always visible (important for debugging issues)
   */
  warn(message: string, data?: any) {
    console.warn(`⚠️ [WARN] ${message}`, data !== undefined ? data : '');
  }

  /**
   * Error logging - always visible
   */
  error(message: string, error?: any) {
    console.error(`❌ [ERROR] ${message}`, error !== undefined ? error : '');
    
    // In production, send to crash reporting service
    if (!isDevelopment && error) {
      try {
        // Send to crash logger if available
        const { crashLogger } = require('../services/crashLogger');
        if (crashLogger && crashLogger.logError) {
          crashLogger.logError(error, { context: message });
        }
      } catch (e) {
        // Fail silently if crash logger not available
      }
    }
  }

  /**
   * Success logging - visible in DEV only
   */
  success(message: string) {
    if (isDevelopment) {
      console.log(`✅ [SUCCESS] ${message}`);
    }
  }

  /**
   * Debug logging - visible in DEV only
   */
  debug(message: string, data?: any) {
    if (isDevelopment) {
      console.log(`🐛 [DEBUG] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * Performance logging - visible in DEV only
   */
  perf(operation: string, duration: number) {
    if (isDevelopment) {
      console.log(`⏱️ [PERF] ${operation} took ${duration}ms`);
    }
  }
}

export default new Logger();
