# Sleep Data Calculation Analysis - SleepAnalysisScreen & JournalScreen

## ✅ **CALCULATED FROM REAL SLEEP DATA**

### **Sleep Analysis Screen:**

1. **Sleep Score (Hero Card)** ✅
   - Source: `latestSession.sleepScore` 
   - Calculated using `calculateSleepScore()` from actual session data
   - Based on: duration, quality, sleep stages, wake-ups

2. **Total Sleep Duration** ✅
   - Source: `latestSession.duration`
   - Calculated from: `endTime - startTime`

3. **Deep Sleep Percentage** ✅
   - Source: `latestSession.sleepStages`
   - Calculated from actual sleep stage segments
   - Formula: `(deep stage duration / total duration) * 100`

4. **Efficiency** ✅
   - Source: `latestSession.efficiency`
   - Calculated from: time asleep vs time in bed

5. **Sleep Composition (Donut Chart)** ✅
   - Source: `latestSession.sleepStages`
   - **Actual calculation** if stages exist
   - Shows: Deep, REM, Light, Awake percentages from tracked data

6. **Snoring Duration** ✅
   - Source: `latestSession.snoringDuration`
   - From `sleepRecorderService` acoustic analysis

7. **Wake-ups** ✅
   - Source: `latestSession.wakeUps`
   - Tracked via accelerometer `sleepTrackingService`

8. **Movement Events** ✅
   - Source: `latestSession.movementEvents`
   - From accelerometer data during sleep

9. **Movement Score** ✅
   - Source: `latestSession.movementScore`
   - Calculated from movement frequency & intensity

10. **Audio Recordings** ✅
    - Source: Database `recording_events` table
    - Actual snoring/sleep-talk recordings from session

11. **Bedtime & Wake Time** ✅
    - Source: `latestSession.startTime` and `latestSession.endTime`
    - Actual recorded times

12. **Sleep Debt** ✅
    - Calculated from last 7 days of actual sleep data
    - Formula: `(8 hours * 7) - actual total hours slept`

13. **Best/Worst Night** ✅
    - Source: `sleepHistory` array
    - Actual comparison of all session scores

14. **AI Insights** ✅
    - Source: `aiInsightService.generateInsights()`
    - Generated from **actual sleep patterns** in database

---

## ❌ **SIMULATED / HARDCODED / PLACEHOLDER DATA**

### **Sleep Analysis Screen:**

1. **SpO2 (Oxygen Saturation)** ❌ **SIMULATED**
   - Source: `enrichSession()` function
   - **Generates random value**: 93-99%
   - Uses deterministic seed based on session time
   - **Hardware limitation**: App doesn't have SpO2 sensor

2. **Respiratory Rate** ❌ **SIMULATED**
   - Source: `enrichSession()` function
   - **Generates random value**: 12-20 bpm
   - **Hardware limitation**: App doesn't measure breathing rate

3. **Apnea Risk** ❌ **SIMULATED**
   - Source: `enrichSession()` function
   - **Randomly assigned**: 'low', 'moderate', or 'high'
   - Not based on actual apnea detection

4. **Sleep Wave Chart (Hypnogram)** ❌ **HARDCODED VISUALIZATION**
   - Source: `trendData` from last 7 days
   - Shows sleep **scores**, not actual sleep stages over time
   - Not a true medical hypnogram

5. **HRV Trend (Heart Rate Variability)** ❌ **COMPLETELY SIMULATED**
   - Source: Hardcoded placeholder
   - Line 1104: `[40, 60, 45, 70, 55, 65, 85]`
   - **Hardware limitation**: App doesn't measure heart rate

6. **Sleep Regularity Chart** ❌ **PARTIALLY SIMULATED**
   - If data exists: Uses real sleep scores
   - If no data: Hardcoded `[85, 92, 78, 95, 88, 72, 90]`

7. **Ambient Noise Level** ❌ **SIMULATED**
   - Source: `enrichSession()` function
   - **Generates random value**: 25-60 dB
   - **Hardware limitation**: App doesn't measure ambient noise

8. **Light Exposure** ❌ **SIMULATED**
   - Source: `enrichSession()` function
   - **Generates random value**: 0-200 lux
   - **Hardware limitation**: App doesn't measure light levels

9. **Chronotype** ❌ **SIMULATED**
   - Source: `enrichSession()` function
   - **Randomly assigned**: 'Morning Lark', 'Night Owl', etc.
   - Not based on circadian rhythm analysis

10. **Optimal Bedtime Window** ❌ **CALCULATED FROM AVERAGES**
    - Based on average of past bedtimes
    - Not personalized chronotype analysis

11. **Sleep Patterns Heatmap (28 days)** ⚠️ **PARTIAL**
    - Uses real sleep scores if data exists
    - Shows colors based on score ranges
    - But limited to sessions stored in history

12. **Movement Heatmap (24-hour bars)** ❌ **PLACEHOLDER**
    - Line 974: `Math.random() > 0.7 ? 15 : 6`
    - Not actual hourly movement data
    - Only shows IF movement occurred, not WHEN

---

## 📊 **Journal Screen Analysis**

### ✅ **REAL DATA**:
1. **Sleep Score** - Actual from session
2. **Duration** - Actual tracked time
3. **Quality** - Calculated from session
4. **Notes** - User-entered text
5. **Tags** - User-selected from predefined list
6. **Audio Disruptions** - Real recordings from database

### ❌ **SIMULATED**:
1. **SpO2** - Same as Analysis screen
2. **Respiratory Rate** - Same as Analysis screen  
3. **Apnea Risk** - Same as Analysis screen
4. **Environmental data** (noise/light) - Simulated

---

## 🔧 **WHAT YOU NEED TO FIX**

### **Priority 1: Remove or Mark Simulated Data**
Options:
1. **Hide** SpO2, Respiratory Rate, Apnea Risk, HRV, Noise, Light, Chronotype
2. **Add "Beta" or "Simulated" badges** to these cards
3. **Replace with message**: "Requires hardware sensor - Coming soon"

### **Priority 2: Fix HRV**
- Currently hardcoded `[40, 60, 45, 70, 55, 65, 85]`
- Either remove completely or mark as "Demo data"

### **Priority 3: Movement Heatmap**
- Currently shows random bars
- Either:
  - Show message "Hourly tracking coming soon"
  - Or remove the 24-bar chart entirely
  - Or store actual hourly movement counts

---

## 📝 **Summary**

**REAL (Calculated) Data:**
- Sleep Score, Duration, Efficiency
- Sleep Stages (Deep, REM, Light, Awake)
- Snoring, Wake-ups, Movement counts
- Audio recordings
- Bedtime/Wake times
- Sleep debt, streaks
- AI Insights

**FAKE (Simulated) Data:**
- SpO2, Respiratory Rate, Apnea Risk
- HRV trend
- Ambient noise, Light levels
- Chronotype
- Hourly movement distribution

Would you like me to:
1. Add "Simulated" badges to fake data?
2. Hide the simulated metrics entirely?
3. Replace them with upgrade prompts for future hardware integration?
