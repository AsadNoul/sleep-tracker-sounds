# Sleep App Feature Enhancement - Integration Guide

## Overview

This document provides a complete guide to integrate 10 new industry-leading features into the sleep app. All features have been implemented with:
- ✅ No breaking changes
- ✅ Backward compatibility
- ✅ Modular architecture
- ✅ TypeScript support
- ✅ Accessibility features

## New Files Created

### Utility Modules (8 new files)
1. **`utils/moodTracking.ts`** - Mood tracking and analysis
2. **`utils/aiInsightsGenerator.ts`** - AI-powered sleep insights
3. **`utils/scoreBreakdown.ts`** - Sleep score component analysis
4. **`utils/recoveryStatus.ts`** - Physical recovery readiness
5. **`utils/sleepDebt.ts`** - Sleep debt tracking
6. **`utils/sleepQualityFactors.ts`** - Environmental factors
7. **`utils/smartAlarm.ts`** - Optimal alarm time calculation
8. **`utils/sleepComparison.ts`** - Trend analysis and comparison
9. **`utils/bedtimeRoutine.ts`** - Guided wind-down routines
10. **`utils/dreamJournal.ts`** - Dream tracking and analysis

### Context Providers (4 new files)
1. **`contexts/MoodContext.tsx`** - Global mood state management
2. **`contexts/InsightsContext.tsx`** - Insights calculation and caching
3. **`contexts/RoutineContext.tsx`** - Wind-down routine state
4. **`contexts/DreamContext.tsx`** - Dream journal state

### UI Components (6 new files)
1. **`components/MoodSelector.tsx`** - Mood logging interface
2. **`components/ScoreBreakdownCard.tsx`** - Visual score breakdown
3. **`components/RecoveryStatusCard.tsx`** - Recovery indicator
4. **`components/SleepDebtVisual.tsx`** - Sleep debt visualization
5. **`components/InsightCard.tsx`** - AI insight cards
6. **`components/DreamEntryForm.tsx`** - Dream entry interface
7. **`components/RoutineActivityList.tsx`** - Routine activity tracking

## Feature Integration Steps

### 1. Set Up Context Providers (Required First Step)

Update your `App.tsx` to wrap with new providers:

```typescript
import { MoodProvider } from './contexts/MoodContext';
import { DreamProvider } from './contexts/DreamContext';
import { RoutineProvider } from './contexts/RoutineContext';
import { InsightsProvider } from './contexts/InsightsContext';

export default function App() {
  const { sleepHistory } = useSleep(); // Your existing context

  return (
    <SleepProvider>
      <MoodProvider>
        <DreamProvider>
          <RoutineProvider>
            <InsightsProvider sleepHistory={sleepHistory}>
              {/* Your app screens */}
            </InsightsProvider>
          </RoutineProvider>
        </DreamProvider>
      </MoodProvider>
    </SleepProvider>
  );
}
```

## Features Breakdown

### Feature 1: Mood Ring 🎭
**Files:** `utils/moodTracking.ts`, `components/MoodSelector.tsx`

Connect mood data with sleep quality metrics.

**Usage in HomeScreen:**
```typescript
import { MoodSelector } from '../components/MoodSelector';
import { useMood } from '../contexts/MoodContext';

export const HomeScreen = () => {
  const { metrics } = useMood();

  return (
    <View>
      <MoodSelector 
        beforeSleep={true}
        onMoodSelected={(mood) => console.log(mood)}
      />
      
      {/* Display mood metrics */}
      <Text>Pre-Sleep: {metrics.preSleepMood}</Text>
      <Text>Post-Sleep: {metrics.postSleepMood}</Text>
    </View>
  );
};
```

---

### Feature 2: AI Sleep Insights 🤖
**Files:** `utils/aiInsightsGenerator.ts`, `components/InsightCard.tsx`

Automatic intelligent insights from sleep data.

**Usage in HomeScreen:**
```typescript
import { InsightSection } from '../components/InsightCard';
import { useInsights } from '../contexts/InsightsContext';

export const HomeScreen = () => {
  const { insights, recommendation } = useInsights();

  return (
    <View>
      <Text>{recommendation}</Text>
      <InsightSection 
        insights={insights}
        onInsightPress={(insight) => console.log(insight)}
      />
    </View>
  );
};
```

---

### Feature 3: Sleep Score Breakdown 📊
**Files:** `utils/scoreBreakdown.ts`, `components/ScoreBreakdownCard.tsx`

Show what components affect the sleep score.

**Usage:**
```typescript
import { ScoreBreakdownCard } from '../components/ScoreBreakdownCard';
import { useInsights } from '../contexts/InsightsContext';

export const AnalyticsScreen = () => {
  const { scoreBreakdown } = useInsights();

  if (!scoreBreakdown) return null;

  return (
    <ScoreBreakdownCard 
      breakdown={scoreBreakdown}
      onPress={() => {
        // Show detailed breakdown modal
      }}
    />
  );
};
```

---

### Feature 4: Recovery Status 💪
**Files:** `utils/recoveryStatus.ts`, `components/RecoveryStatusCard.tsx`

Show physical readiness based on sleep.

**Usage:**
```typescript
import { RecoveryStatusCard } from '../components/RecoveryStatusCard';
import { useInsights } from '../contexts/InsightsContext';

export const HomeScreen = () => {
  const { recoveryStatus } = useInsights();

  if (!recoveryStatus) return null;

  return (
    <RecoveryStatusCard 
      status={recoveryStatus}
      onPress={() => {
        // Show detailed recovery analysis
      }}
    />
  );
};
```

---

### Feature 5: Sleep Debt Visualization 📉
**Files:** `utils/sleepDebt.ts`, `components/SleepDebtVisual.tsx`

Track cumulative sleep deficit.

**Usage:**
```typescript
import { SleepDebtVisual } from '../components/SleepDebtVisual';
import { useInsights } from '../contexts/InsightsContext';

export const AnalyticsScreen = () => {
  const { sleepDebt } = useInsights();

  if (!sleepDebt) return null;

  return (
    <SleepDebtVisual 
      metrics={sleepDebt}
      onPress={() => {
        // Show payoff strategies
      }}
    />
  );
};
```

---

### Feature 6: Bedtime Wind-Down Routine 🌙
**Files:** `utils/bedtimeRoutine.ts`, `components/RoutineActivityList.tsx`

Guided pre-sleep routine with multiple activities.

**Usage:**
```typescript
import { useRoutine } from '../contexts/RoutineContext';
import { RoutineActivityList, RoutineProgressBar } from '../components/RoutineActivityList';

export const BedtimeRoutineScreen = () => {
  const {
    selectedRoutine,
    currentActivityIndex,
    isActive,
    startRoutine,
    nextActivity,
  } = useRoutine();

  if (!selectedRoutine) return null;

  return (
    <View>
      <RoutineProgressBar 
        current={currentActivityIndex + 1} 
        total={selectedRoutine.activities.length} 
      />
      
      <RoutineActivityList
        activities={selectedRoutine.activities}
        currentActivityIndex={currentActivityIndex}
        onActivityPress={(index) => {
          // Handle activity click
        }}
      />
      
      <TouchableOpacity onPress={isActive ? nextActivity : startRoutine}>
        <Text>{isActive ? 'Next' : 'Start Routine'}</Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

### Feature 7: Smart Alarm Window ⏰
**Files:** `utils/smartAlarm.ts`

Calculate optimal wake-up times based on sleep cycles.

**Usage:**
```typescript
import { calculateAlarmWindows, getNextOptimalAlarmTime } from '../utils/smartAlarm';

export const AlarmSetupScreen = () => {
  const { sleepHistory } = useSleep();
  const lastSession = sleepHistory[0];

  const windows = calculateAlarmWindows(lastSession);
  const nextOptimal = getNextOptimalAlarmTime(lastSession);

  return (
    <View>
      <Text>Suggested wake time: {nextOptimal.time.toLocaleTimeString()}</Text>
      <Text>{nextOptimal.reason}</Text>
      
      {windows.map((window) => (
        <Text key={window.startTime.toString()}>
          {window.startTime.toLocaleTimeString()} - {window.quality}
        </Text>
      ))}
    </View>
  );
};
```

---

### Feature 8: Comparison Charts 📈
**Files:** `utils/sleepComparison.ts`

Trends over different time periods.

**Usage:**
```typescript
import { getComparisonData, getTrendInsights } from '../utils/sleepComparison';
import { useInsights } from '../contexts/InsightsContext';

export const TrendsScreen = () => {
  const { comparisonData } = useInsights();

  if (!comparisonData) return null;

  const insights = getTrendInsights(comparisonData);

  return (
    <View>
      <Text>This Week: {comparisonData.thisWeek.avgDuration}h avg</Text>
      <Text>Last Week: {comparisonData.lastWeek.avgDuration}h avg</Text>
      <Text>Change: {comparisonData.comparison.weekOverWeekChange}%</Text>
      
      {insights.map((insight, i) => (
        <Text key={i}>{insight}</Text>
      ))}
    </View>
  );
};
```

---

### Feature 9: Sleep Quality Factors 🌡️
**Files:** `utils/sleepQualityFactors.ts`

Track environmental conditions.

**Usage:**
```typescript
import { scoreEnvironmentFactors, getEnvironmentRecommendations } from '../utils/sleepQualityFactors';

export const EnvironmentTrackerScreen = () => {
  const [environment, setEnvironment] = useState({
    temperature: 17,
    humidity: 45,
    noiseLevel: 25,
    lightLevel: 'dark' as const,
  });

  const factors = scoreEnvironmentFactors(environment);
  const recommendations = getEnvironmentRecommendations(environment);

  return (
    <View>
      {factors.map((factor) => (
        <View key={factor.factor}>
          <Text>{factor.emoji} {factor.factor}: {factor.value}</Text>
        </View>
      ))}
      
      {recommendations.map((rec, i) => (
        <Text key={i}>{rec}</Text>
      ))}
    </View>
  );
};
```

---

### Feature 10: Dream Journal 💭
**Files:** `utils/dreamJournal.ts`, `components/DreamEntryForm.tsx`

Log and analyze dreams.

**Usage:**
```typescript
import { DreamEntryForm } from '../components/DreamEntryForm';
import { useDream } from '../contexts/DreamContext';
import { getDreamInsights } from '../utils/dreamJournal';

export const DreamJournalScreen = () => {
  const { dreams, analysis } = useDream();

  const insights = getDreamInsights(dreams);

  return (
    <View>
      <DreamEntryForm 
        onDreamAdded={(dream) => console.log(dream)}
      />
      
      <Text>Total Dreams: {analysis.totalDreams}</Text>
      <Text>Most Common Mood: {analysis.mostCommonMood}</Text>
      
      {insights.map((insight, i) => (
        <Text key={i}>{insight}</Text>
      ))}
    </View>
  );
};
```

---

## Recommended Integration Order

For optimal implementation:

1. **Week 1:** Set up contexts + Features 1-3 (Mood, Insights, Score Breakdown)
2. **Week 2:** Features 4-5 (Recovery, Sleep Debt) + Component cards
3. **Week 3:** Features 6-7 (Wind-Down, Smart Alarm)
4. **Week 4:** Features 8-10 (Comparison, Factors, Dreams)

## Testing Checklist

- [ ] All contexts initialize without errors
- [ ] Components render with existing sleep data
- [ ] Mood entries save to localStorage
- [ ] Insights update when new sleep session added
- [ ] Recovery status reflects sleep history
- [ ] Sleep debt calculates correctly
- [ ] Wind-down routine timers work
- [ ] Dream entries persist
- [ ] Theme integration works (light/dark mode)
- [ ] Accessibility labels present on all buttons

## Common Integration Issues

### Issue: Context not found error
**Solution:** Make sure providers are wrapped in correct order in App.tsx

### Issue: Empty insights
**Solution:** Ensure sleepHistory is passed to InsightsProvider

### Issue: Mood not saving
**Solution:** MoodProvider uses localStorage by default. For Supabase, modify MoodContext.tsx

### Issue: Components look wrong
**Solution:** Ensure ThemeContext is also provided

## Future Enhancements

- [ ] Supabase integration for data persistence
- [ ] Wearable device data integration
- [ ] ML-based pattern recognition
- [ ] Push notifications for insights
- [ ] Social features (share insights)
- [ ] Export data as PDF
- [ ] Integration with Apple Health/Google Fit

## Performance Notes

- Insights are memoized - expensive calculations only run when sleepHistory changes
- Dream analysis is memoized to prevent unnecessary recalculations
- Use FlatList for large dream/mood histories
- Consider pagination for >100 entries

## Accessibility Features

All components include:
- Voice-over labels via `a11y` utility
- Proper contrast ratios
- Touch targets ≥44pt
- VoiceOver support
- Clear error messages

## Need Help?

Refer to individual utility files for:
- Function signatures
- TypeScript types
- Usage examples
- Algorithm explanations
