import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Animated,
    Image,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import * as Updates from 'expo-updates';
import { LinearGradient } from 'expo-linear-gradient';
import { Download, CheckCircle, XCircle } from 'lucide-react-native';
import { useAppTheme } from '../hooks/useAppTheme';

interface UpdateCheckerProps {
    onUpdateComplete?: () => void;
}

export default function UpdateChecker({ onUpdateComplete }: UpdateCheckerProps) {
    const { theme, isDark } = useAppTheme();
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [showModal, setShowModal] = useState(false);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (showModal) {
            // Fade in animation
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]).start();

            // Continuous pulse animation for logo
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [showModal]);

    useEffect(() => {
        if (isDownloading) {
            // Animate progress bar
            Animated.timing(progressAnim, {
                toValue: downloadProgress,
                duration: 300,
                useNativeDriver: false,
            }).start();
        }
    }, [downloadProgress, isDownloading]);

    useEffect(() => {
        checkForUpdates();
    }, []);

    const checkForUpdates = async () => {
        // Skip in development mode
        if (__DEV__) {
            console.log('⚠️ OTA Updates disabled in development mode');
            return;
        }

        try {
            setIsCheckingUpdate(true);
            setShowModal(true);

            const update = await Updates.checkForUpdateAsync();

            if (update.isAvailable) {
                setUpdateAvailable(true);
                await downloadUpdate();
            } else {
                console.log('✅ App is up to date!');
                setTimeout(() => {
                    setShowModal(false);
                    onUpdateComplete?.();
                }, 1500);
            }
        } catch (error) {
            console.error('❌ Error checking for updates:', error);
            setUpdateError('Failed to check for updates');
            setTimeout(() => {
                setShowModal(false);
                onUpdateComplete?.();
            }, 2000);
        } finally {
            setIsCheckingUpdate(false);
        }
    };

    const downloadUpdate = async () => {
        try {
            setIsDownloading(true);

            // Simulate download progress (Expo doesn't provide real-time progress)
            const progressInterval = setInterval(() => {
                setDownloadProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + 10;
                });
            }, 200);

            await Updates.fetchUpdateAsync();

            clearInterval(progressInterval);
            setDownloadProgress(100);

            // Wait a bit to show 100% completion
            setTimeout(async () => {
                setIsDownloading(false);
                setShowModal(false);

                // Reload the app with the new update
                await Updates.reloadAsync();
            }, 1000);

        } catch (error) {
            console.error('❌ Error downloading update:', error);
            setUpdateError('Failed to download update');
            setIsDownloading(false);
            setTimeout(() => {
                setShowModal(false);
                onUpdateComplete?.();
            }, 2000);
        }
    };

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    return (
        <Modal
            visible={showModal}
            transparent
            animationType="none"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.container,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={['#1a1a2e', '#16213e', '#0f0f1e']}
                        style={styles.gradient}
                    >
                        {/* App Logo with Pulse Animation */}
                        <Animated.View
                            style={[
                                styles.logoContainer,
                                { transform: [{ scale: pulseAnim }] },
                            ]}
                        >
                            <LinearGradient
                                colors={['#8B5CF6', '#7C3AED']}
                                style={styles.logoGradient}
                            >
                                <Image
                                    source={require('../assets/icon.png')}
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                            </LinearGradient>
                        </Animated.View>

                        {/* App Name */}
                        <Text style={styles.appName}>Sleep Architect</Text>

                        {/* Status Message */}
                        {isCheckingUpdate && (
                            <View style={styles.statusContainer}>
                                <ActivityIndicator size="small" color="#8B5CF6" />
                                <Text style={styles.statusText}>Checking for updates...</Text>
                            </View>
                        )}

                        {isDownloading && (
                            <>
                                <View style={styles.statusContainer}>
                                    <Download size={20} color="#8B5CF6" />
                                    <Text style={styles.statusText}>Downloading update...</Text>
                                </View>

                                {/* Progress Bar */}
                                <View style={styles.progressBarContainer}>
                                    <Animated.View
                                        style={[
                                            styles.progressBar,
                                            {
                                                width: progressWidth,
                                            },
                                        ]}
                                    >
                                        <LinearGradient
                                            colors={['#8B5CF6', '#7C3AED']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    </Animated.View>
                                </View>

                                {/* Progress Percentage */}
                                <Text style={styles.progressText}>{downloadProgress}%</Text>
                            </>
                        )}

                        {updateError && (
                            <View style={styles.statusContainer}>
                                <XCircle size={20} color="#EF4444" />
                                <Text style={[styles.statusText, { color: '#EF4444' }]}>
                                    {updateError}
                                </Text>
                            </View>
                        )}

                        {!isCheckingUpdate && !isDownloading && !updateError && (
                            <View style={styles.statusContainer}>
                                <CheckCircle size={20} color="#10B981" />
                                <Text style={[styles.statusText, { color: '#10B981' }]}>
                                    App is up to date!
                                </Text>
                            </View>
                        )}

                        {/* Version Info */}
                        <Text style={styles.versionText}>
                            v2.1.0
                        </Text>
                    </LinearGradient>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '85%',
        maxWidth: 400,
        borderRadius: 32,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    gradient: {
        padding: 40,
        alignItems: 'center',
    },
    logoContainer: {
        marginBottom: 20,
    },
    logoGradient: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    logo: {
        width: 80,
        height: 80,
    },
    appName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 30,
        fontFamily: 'Poppins-Bold',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    statusText: {
        fontSize: 14,
        color: '#A8B5C7',
        fontFamily: 'Poppins-Medium',
    },
    progressBarContainer: {
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 15,
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8B5CF6',
        fontFamily: 'Poppins-Bold',
        marginBottom: 10,
    },
    versionText: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 10,
        fontFamily: 'Poppins-Regular',
    },
});
