# Admin Dashboard - Quick Integration Guide

## 📁 Files Created

```
admin/
├── adminAnalytics.ts          # Analytics calculations
├── adminUserManagement.ts     # User management utilities
├── featureFlags.ts            # Feature flags & A/B testing
├── AdminContext.tsx           # State management
└── AdminDashboard.tsx         # Main dashboard screen
```

## ⚡ Quick Setup (2 Steps)

### Step 1: Add AdminProvider to App.tsx

```typescript
import { AdminProvider } from './admin/AdminContext'
import { useSleep } from './contexts/SleepContext'
import { useMood } from './contexts/MoodContext'
import { useDream } from './contexts/DreamContext'

export default function App() {
  const { sleepHistory } = useSleep()
  const { moodEntries } = useMood()
  const { dreams } = useDream()

  return (
    <AdminProvider sleepHistory={sleepHistory} moods={moodEntries} dreams={dreams}>
      {/* Your app screens */}
    </AdminProvider>
  )
}
```

### Step 2: Add Admin Screen (Optional)

```typescript
// Create new screen or add to settings
import { useAdmin } from '../admin/AdminContext'
import { AdminDashboardContent } from '../admin/AdminDashboard'

export const AdminScreenOnly = () => {
  const { isAdmin, enableAdminMode } = useAdmin()

  // Only show to admins (add auth check)
  if (!isAdmin) {
    return (
      <TouchableOpacity onPress={enableAdminMode}>
        <Text>Enable Admin</Text>
      </TouchableOpacity>
    )
  }

  return <AdminDashboardContent />
}
```

## 📊 What You Get

### Dashboard Shows:
- ✅ **Key Metrics** - Users, sessions, sleep duration, quality
- ✅ **Feature Adoption** - Mood, dreams, lucid dream %, feature usage
- ✅ **Engagement Targets** - Track progress vs goals
- ✅ **System Health** - Database, API, uptime, error rates

### User Management:
- Export user data (GDPR compliant)
- Suspend/delete accounts
- Reset user data
- Send bulk messages
- Analyze user behavior & churn risk

### Feature Flags:
- Enable/disable features
- Gradual rollout (0-100%)
- A/B testing support
- Audience targeting (all/beta/premium)
- Built-in flags for all 10 features

## 🔧 Common Admin Tasks

### Check if Feature is Enabled
```typescript
import { isFeatureEnabled, DEFAULT_FEATURE_FLAGS } from './admin/featureFlags'

const moodRingFlag = DEFAULT_FEATURE_FLAGS.find(f => f.id === 'feature-mood-ring')
const isEnabled = isFeatureEnabled(moodRingFlag, userId, 'premium')
```

### Export User Data
```typescript
import { exportUserData } from './admin/adminUserManagement'

const jsonData = exportUserData(userId)
// Save or send to user email
```

### Create Bulk Message
```typescript
import { createBulkMessage } from './admin/adminUserManagement'

const message = createBulkMessage(
  'New AI Insights!',
  'Check out personalized insights',
  'active'
)
```

### Run Feature A/B Test
```typescript
import { calculateABTestResults } from './admin/featureFlags'

const result = calculateABTestResults(
  453,  // conversions variant A
  521,  // conversions variant B
  5000, // total sample size
  'feature-ai-insights'
)

console.log(result.winner)     // 'B'
console.log(result.confidence) // 95%
```

## 🎯 Dashboard Metrics Explained

| Metric | Target | Good | Fair |
|--------|--------|------|------|
| Logging Streak | 30 days | 20+ | 10+ |
| Sleep Quality | 75% | 75%+ | 60%+ |
| Sleep Duration | 8h | 7-9h | 6-9h |
| Mood Entries | 30/month | 20+ | 10+ |
| Dream Entries | 20/month | 15+ | 8+ |

## 🔐 Security Notes

⚠️ **For Production:**
1. Add admin authentication (role-based access control)
2. Implement audit logging for admin actions
3. Use encrypted connections for data export
4. Rate limit feature flag changes
5. Require 2FA for sensitive operations

## 📈 Typical Admin Workflow

1. **Morning:** Check dashboard for system health
2. **Weekly:** Review engagement metrics vs targets
3. **As Needed:** Rollout features gradually
4. **Monthly:** Generate usage report
5. **Quarterly:** Plan new features based on A/B tests

## 🚀 Advanced Features

### Monitor Feature Flag Adoption
```typescript
const analytics = useAdmin()
// Check which features users are actually using
console.log(analytics.features.lucidDreamRate) // 12% adoption
```

### Track User Segments
```typescript
import { analyzeUserBehavior } from './admin/adminUserManagement'

const behavior = analyzeUserBehavior(userId, sessionCount)
console.log(behavior.churnRisk) // 'low' | 'medium' | 'high'
```

### System Health Monitoring
```typescript
const { health } = useAdmin()

if (health.dbHealth === 'critical') {
  // Alert admin
  sendAlert('Database critical!')
}
```

## 📝 No Breaking Changes

✅ Zero changes to existing screens
✅ Zero changes to existing functions
✅ Completely optional feature
✅ Can be disabled if needed
✅ Admin component can be hidden from regular users

## 🎨 Theme Integration

Dashboard automatically uses your existing theme:
- Dark/light mode support
- All colors from theme.ts
- Accessibility labels included
- Responsive design

## 🧪 Testing the Admin Dashboard

```typescript
// Mock data for testing
const mockSleep: SleepSession[] = [/* ... */]
const mockMoods: MoodEntry[] = [/* ... */]
const mockDreams: DreamEntry[] = [/* ... */]

return (
  <AdminProvider 
    sleepHistory={mockSleep}
    moods={mockMoods}
    dreams={mockDreams}
  >
    <AdminDashboardContent />
  </AdminProvider>
)
```

## 🤝 Integration Checklist

- [ ] Files copied to `admin/` folder
- [ ] AdminProvider added to App.tsx
- [ ] (Optional) Admin screen created
- [ ] Dashboard testing with sample data
- [ ] Feature flags reviewed
- [ ] Admin auth added (for production)
- [ ] Audit logging configured
- [ ] Theme colors verified

## 📞 Need Help?

Each admin file includes:
- JSDoc comments on all functions
- Example usage in sections above
- TypeScript types for IDE support
- No external dependencies beyond existing code

---

**Admin dashboard is ready to use! Zero existing code modified.** ✅
