import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, Mail } from 'lucide-react-native';
import { darkTheme } from '../constants/theme';
import { crashLogger } from '../services/crashLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: { componentStack: string } | null;
}

/**
 * Error Boundary Component
 * Catches unhandled errors and shows user-friendly error screen
 * Instead of blank white screen or crash
 */
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    // Log error details for debugging
    console.error('=== APP ERROR CAUGHT ===');
    console.error('Error:', error.toString());
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('========================');

    // Update state with error details FIRST
    this.setState({
      error,
      errorInfo,
    });

    // Send crash report to your email (NO DEPENDENCIES!)
    // Wrap in try-catch to prevent error boundary from crashing
    try {
      crashLogger.reportCrash(
        error,
        'critical',
        errorInfo.componentStack
      ).catch((reportError) => {
        // If crash reporting fails, just log it - don't crash the error boundary
        console.error('Failed to send crash report:', reportError);
      });
    } catch (reportError) {
      console.error('Failed to send crash report:', reportError);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    // Always use darkTheme - can't rely on context when app is broken
    const theme = darkTheme;

    if (this.state.hasError) {
      return (
        <View style={styles(theme).container}>
          <LinearGradient
            colors={[theme.colors.background, theme.colors.backgroundSecondary, theme.colors.background]}
            style={styles(theme).gradient}
          >
            <ScrollView
              contentContainerStyle={styles(theme).content}
              showsVerticalScrollIndicator={false}
            >
              {/* Error Icon */}
              <View style={styles(theme).iconContainer}>
                <AlertCircle size={80} color={theme.colors.danger} />
              </View>

              {/* Error Title */}
              <Text style={styles(theme).title}>Oops! Something Went Wrong</Text>

              {/* Error Message */}
              <Text style={styles(theme).subtitle}>
                We encountered an unexpected error. Don't worry, we've logged this issue and will fix it soon.
              </Text>

              {/* Error Details (for debugging) */}
              {this.state.error && (
                <View style={styles(theme).errorDetailsContainer}>
                  <Text style={styles(theme).errorDetailsTitle}>Error Details:</Text>
                  <Text style={styles(theme).errorDetailsText}>
                    {this.state.error.toString()}
                  </Text>

                  {this.state.errorInfo && (
                    <>
                      <Text style={[styles(theme).errorDetailsTitle, { marginTop: 12 }]}>
                        Component Stack:
                      </Text>
                      <Text style={styles(theme).errorDetailsText}>
                        {this.state.errorInfo.componentStack}
                      </Text>
                    </>
                  )}
                </View>
              )}

              {/* What You Can Do */}
              <View style={styles(theme).suggestionsContainer}>
                <Text style={styles(theme).suggestionsTitle}>What You Can Do:</Text>
                <View style={styles(theme).suggestionItem}>
                  <Text style={styles(theme).suggestionBullet}>•</Text>
                  <Text style={styles(theme).suggestionText}>
                    Try restarting the app
                  </Text>
                </View>
                <View style={styles(theme).suggestionItem}>
                  <Text style={styles(theme).suggestionBullet}>•</Text>
                  <Text style={styles(theme).suggestionText}>
                    Check your internet connection
                  </Text>
                </View>
                <View style={styles(theme).suggestionItem}>
                  <Text style={styles(theme).suggestionBullet}>•</Text>
                  <Text style={styles(theme).suggestionText}>
                    Clear app cache and try again
                  </Text>
                </View>
                <View style={styles(theme).suggestionItem}>
                  <Text style={styles(theme).suggestionBullet}>•</Text>
                  <Text style={styles(theme).suggestionText}>
                    Contact support if problem persists
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles(theme).buttonContainer}>
                <TouchableOpacity
                  style={styles(theme).resetButton}
                  onPress={this.handleReset}
                  activeOpacity={0.9}
                >
                  <RefreshCw size={20} color={theme.colors.accent} />
                  <Text style={styles(theme).resetButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>

              {/* Support Note */}
              <Text style={styles(theme).supportNote}>
                If this keeps happening, please contact our support team with the error details above.
              </Text>
            </ScrollView>
          </LinearGradient>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  errorDetailsContainer: {
    backgroundColor: 'rgba(229, 115, 115, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#E57373',
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E57373',
    marginBottom: 8,
  },
  errorDetailsText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  suggestionsContainer: {
    backgroundColor: 'rgba(0, 255, 209, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  suggestionBullet: {
    fontSize: 16,
    color: theme.colors.accent,
    marginRight: 10,
    fontWeight: 'bold',
  },
  suggestionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  resetButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  supportNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});

// Export directly - no theme wrapper needed (uses hardcoded darkTheme for safety)
export default ErrorBoundary;
