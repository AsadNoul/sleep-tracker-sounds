import React, { memo, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, G, Line, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

/**
 * Enhanced Sleep Trend Wave Chart (Hypnogram Style)
 * Visualizes the cycling between sleep stages
 */
export const SleepWaveChart = memo(({ data, theme, isDark }: any) => {
    const [containerWidth, setContainerWidth] = useState(0);
    if (!data || data.length === 0) return null;

    const chartHeight = 120;
    const chartWidth = containerWidth > 0 ? containerWidth - 60 : width - 150;
    const pointSpacing = chartWidth / (data.length - 1 || 1);

    // Filter out potential NaN values
    const safeData = data.map((d: any) => ({ ...d, value: isNaN(d.value) ? 50 : d.value }));
    const maxValue = Math.max(...safeData.map((d: any) => d.value), 100);

    // Create a smooth curve using Cubic Bezier
    let pathData = `M 0 ${chartHeight - (safeData[0].value / maxValue) * chartHeight}`;

    for (let i = 0; i < safeData.length - 1; i++) {
        const x1 = i * pointSpacing;
        const y1 = chartHeight - (safeData[i].value / maxValue) * chartHeight;
        const x2 = (i + 1) * pointSpacing;
        const y2 = chartHeight - (safeData[i + 1].value / maxValue) * chartHeight;

        const cx = (x1 + x2) / 2;
        pathData += ` C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
    }

    const areaPath = `${pathData} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

    return (
        <View
            style={styles(theme, isDark).chartContainer}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
            <View style={styles(theme, isDark).chartYAxis}>
                <Text style={styles(theme, isDark).chartYLabel}>Awake</Text>
                <Text style={styles(theme, isDark).chartYLabel}>REM</Text>
                <Text style={styles(theme, isDark).chartYLabel}>Light</Text>
                <Text style={styles(theme, isDark).chartYLabel}>Deep</Text>
            </View>
            <View style={styles(theme, isDark).chartMain}>
                <Text style={styles(theme, isDark).chartAnnotation}>90 minute sleep cycles</Text>
                <View style={styles(theme, isDark).chartWrapper}>
                    <Svg height={chartHeight + 20} width={chartWidth}>
                        <Defs>
                            <SvgLinearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.5" />
                                <Stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
                            </SvgLinearGradient>
                        </Defs>
                        <G>
                            {[25, 50, 75, 100].map((v, i) => (
                                <Line
                                    key={i}
                                    x1="0"
                                    y1={chartHeight - (v / maxValue) * chartHeight}
                                    x2={chartWidth}
                                    y2={chartHeight - (v / maxValue) * chartHeight}
                                    stroke="rgba(255, 255, 255, 0.05)"
                                    strokeWidth="1"
                                />
                            ))}

                            <Path d={areaPath} fill="url(#waveGradient)" />
                            <Path d={pathData} stroke="#8B5CF6" strokeWidth="3" fill="none" />

                            {safeData.map((d: any, i: number) => (
                                <Circle
                                    key={i}
                                    cx={i * pointSpacing}
                                    cy={chartHeight - (d.value / maxValue) * chartHeight}
                                    r="4"
                                    fill="#8B5CF6"
                                    stroke="#0F0F1E"
                                    strokeWidth="1.5"
                                />
                            ))}
                        </G>
                    </Svg>
                    <View style={styles(theme, isDark).chartXAxis}>
                        <Text style={styles(theme, isDark).chartXLabel}>10PM</Text>
                        <Text style={styles(theme, isDark).chartXLabel}>12AM</Text>
                        <Text style={styles(theme, isDark).chartXLabel}>2AM</Text>
                        <Text style={styles(theme, isDark).chartXLabel}>4AM</Text>
                        <Text style={styles(theme, isDark).chartXLabel}>6AM</Text>
                    </View>
                </View>
            </View>
        </View>
    );
});

/**
 * Sleep Composition Donut Chart
 * Visualizes the percentage distribution of sleep stages
 */
export const SleepCompositionChart = memo(({ theme, isDark, latestSession }: any) => {
    const distribution = useMemo(() => {
        if (!latestSession || !latestSession.sleepStages || latestSession.sleepStages.length === 0) {
            return [
                { label: 'Deep', value: 18, color: '#4F46E5' },
                { label: 'REM', value: 22, color: '#8B5CF6' },
                { label: 'Light', value: 55, color: '#6366F1' },
                { label: 'Awake', value: 5, color: '#EF4444' }
            ];
        }

        const stages = latestSession.sleepStages;
        const totals: any = { deep: 0, rem: 0, light: 0, awake: 0 };

        stages.forEach((s: any) => {
            const dur = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000;
            if (totals[s.stage] !== undefined) totals[s.stage] += dur;
        });

        const total = Object.values(totals).reduce((a: any, b: any) => a + b, 0) as number;
        if (total === 0) return [
            { label: 'Deep', value: 18, color: '#4F46E5' },
            { label: 'REM', value: 22, color: '#8B5CF6' },
            { label: 'Light', value: 55, color: '#6366F1' },
            { label: 'Awake', value: 5, color: '#EF4444' }
        ];

        return [
            { label: 'Deep', value: Math.round((totals.deep / total) * 100), color: '#4F46E5' },
            { label: 'REM', value: Math.round((totals.rem / total) * 100), color: '#8B5CF6' },
            { label: 'Light', value: Math.round((totals.light / total) * 100), color: '#6366F1' },
            { label: 'Awake', value: Math.round((totals.awake / total) * 100), color: '#EF4444' }
        ];
    }, [latestSession]);

    const size = 120;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;

    let totalPercent = 0;

    return (
        <View style={styles(theme, isDark).compositionContainer}>
            <View style={styles(theme, isDark).compositionChart}>
                <Svg height={size} width={size}>
                    {distribution.map((item, i) => {
                        const dashArray = `${(item.value / 100) * circumference} ${circumference}`;
                        const dashOffset = - (totalPercent / 100) * circumference;
                        totalPercent += item.value;

                        return (
                            <Circle
                                key={i}
                                cx={center}
                                cy={center}
                                r={radius}
                                stroke={item.color}
                                strokeWidth={strokeWidth}
                                strokeDasharray={dashArray}
                                strokeDashoffset={dashOffset}
                                fill="none"
                                strokeLinecap="round"
                                transform={`rotate(-90 ${center} ${center})`}
                            />
                        );
                    })}
                </Svg>
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={styles(theme, isDark).compositionCenterText}>
                        {latestSession ? `${Math.floor(latestSession.duration / 60)}h ${latestSession.duration % 60}m` : '0h 0m'}
                    </Text>
                    <Text style={styles(theme, isDark).compositionCenterSubtext}>Total</Text>
                </View>
            </View>
            <View style={styles(theme, isDark).compositionLegend}>
                {distribution.map((item, i) => (
                    <View key={i} style={styles(theme, isDark).legendItem}>
                        <View style={[styles(theme, isDark).legendDot, { backgroundColor: item.color }]} />
                        <Text style={styles(theme, isDark).legendText}>{item.label}</Text>
                        <Text style={styles(theme, isDark).legendValue}>{item.value}%</Text>
                    </View>
                ))}
            </View>
        </View>
    );
});

const styles = (theme: any, isDark: boolean) => StyleSheet.create({
    chartContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginTop: 10,
        height: 180,
    },
    chartYAxis: {
        justifyContent: 'space-between',
        height: 120,
        paddingRight: 15,
        paddingBottom: 20,
    },
    chartYLabel: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '600',
        textAlign: 'right',
    },
    chartMain: {
        flex: 1,
    },
    chartAnnotation: {
        position: 'absolute',
        top: -20,
        right: 0,
        color: '#64748B',
        fontSize: 10,
        fontStyle: 'italic',
    },
    chartWrapper: {
        flex: 1,
    },
    chartXAxis: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingHorizontal: 0,
    },
    chartXLabel: {
        color: '#64748B',
        fontSize: 10,
    },
    compositionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 30,
        paddingVertical: 10,
    },
    compositionChart: {
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    compositionCenterText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    compositionCenterSubtext: {
        color: '#94A3B8',
        fontSize: 10,
    },
    compositionLegend: {
        flex: 1,
        gap: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        color: '#FFFFFF',
        fontSize: 12,
        flex: 1,
    },
    legendValue: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600',
    },
});
