import { SleepSession } from '../contexts/SleepContext';

export interface SmartInsight {
  id: string;
  title: string;
  message: string;
  icon: string;
  color: string;
  priority: 'high' | 'medium' | 'low';
  actionText?: string;
  actionRoute?: string;
}

/**
 * Generates smart insights based on sleep history
 */
export function generateSmartInsights(sleepHistory: SleepSession[]): SmartInsight[] {
  const insights: SmartInsight[] = [];

  if (sleepHistory.length === 0) {
    return [{
      id: 'welcome',
      title: 'Welcome!',
      message: 'Start tracking your sleep to get personalized insights',
      icon: 'Moon',
      color: '#8B5CF6',
      priority: 'low'
    }];
  }

  // Get last 7 days
  const last7Days = sleepHistory.slice(0, 7);
  const last30Days = sleepHistory.slice(0, 30);

  // 1. Check streak
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < sleepHistory.length; i++) {
    const sessionDate = new Date(sleepHistory[i].startTime);
    const daysDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff === i) {
      streak++;
    } else {
      break;
    }
  }

  if (streak >= 7) {
    insights.push({
      id: 'streak',
      title: '🔥 Amazing Streak!',
      message: `You've tracked sleep for ${streak} days straight! Keep it up!`,
      icon: 'Flame',
      color: '#F97316',
      priority: 'high',
      actionText: 'View Achievements',
      actionRoute: 'Achievements'
    });
  }

  // 2. Weekend vs Weekday analysis
  if (last30Days.length >= 14) {
    const weekdaySessions = last30Days.filter(s => {
      const day = new Date(s.startTime).getDay();
      return day >= 1 && day <= 5;
    });
    const weekendSessions = last30Days.filter(s => {
      const day = new Date(s.startTime).getDay();
      return day === 0 || day === 6;
    });

    if (weekdaySessions.length > 0 && weekendSessions.length > 0) {
      const weekdayAvg = weekdaySessions.reduce((sum, s) => sum + s.duration, 0) / weekdaySessions.length;
      const weekendAvg = weekendSessions.reduce((sum, s) => sum + s.duration, 0) / weekendSessions.length;
      
      const diff = Math.abs(weekendAvg - weekdayAvg);
      if (diff > 60) { // More than 1 hour difference
        const more = weekendAvg > weekdayAvg ? 'weekend' : 'weekday';
        const less = more === 'weekend' ? 'weekday' : 'weekend';
        insights.push({
          id: 'consistency',
          title: '📊 Sleep Pattern Detected',
          message: `You sleep ${Math.round(diff / 60)} hours more on ${more}s. Try for more consistency!`,
          icon: 'Calendar',
          color: '#F59E0B',
          priority: 'medium'
        });
      }
    }
  }

  // 3. Sleep quality trend
  if (last7Days.length >= 5) {
    const recent3 = last7Days.slice(0, 3);
    const previous3 = last7Days.slice(3, 6);
    
    const recentAvgQuality = recent3.reduce((sum, s) => sum + s.quality, 0) / recent3.length;
    const previousAvgQuality = previous3.reduce((sum, s) => sum + s.quality, 0) / previous3.length;
    
    if (recentAvgQuality > previousAvgQuality + 1) {
      insights.push({
        id: 'improving',
        title: '📈 Sleep Improving!',
        message: `Your sleep quality is up ${Math.round(((recentAvgQuality - previousAvgQuality) / previousAvgQuality) * 100)}% this week!`,
        icon: 'TrendingUp',
        color: '#10B981',
        priority: 'high'
      });
    } else if (recentAvgQuality < previousAvgQuality - 1) {
      insights.push({
        id: 'declining',
        title: '⚠️ Sleep Quality Dip',
        message: 'Your sleep quality has decreased recently. Try adjusting your bedtime routine.',
        icon: 'AlertCircle',
        color: '#EF4444',
        priority: 'high',
        actionText: 'View Tips',
        actionRoute: 'BedtimeRoutine'
      });
    }
  }

  // 4. Best sleep time analysis
  if (last30Days.length >= 10) {
    const bestSessions = last30Days
      .filter(s => s.quality >= 8)
      .sort((a, b) => b.quality - a.quality)
      .slice(0, 5);

    if (bestSessions.length >= 3) {
      const avgBedtime = bestSessions.reduce((sum, s) => {
        const hour = new Date(s.startTime).getHours();
        return sum + (hour < 12 ? hour + 24 : hour);
      }, 0) / bestSessions.length;

      const hour = Math.floor(avgBedtime % 24);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour;

      insights.push({
        id: 'besttime',
        title: '🌙 Your Sweet Spot',
        message: `Your best sleep happens when you go to bed around ${displayHour}:00 ${ampm}`,
        icon: 'Clock',
        color: '#8B5CF6',
        priority: 'medium'
      });
    }
  }

  // 5. Interruptions analysis
  if (last7Days.length >= 5) {
    const avgWakeUps = last7Days.reduce((sum, s) => sum + s.wakeUps, 0) / last7Days.length;
    if (avgWakeUps > 3) {
      insights.push({
        id: 'interruptions',
        title: '😴 Too Many Wake-Ups',
        message: `You're waking up ${Math.round(avgWakeUps)} times per night. Consider sleep environment improvements.`,
        icon: 'AlertTriangle',
        color: '#F97316',
        priority: 'medium',
        actionText: 'Check Environment',
        actionRoute: 'RoomEnvironment'
      });
    }
  }

  // 6. Snoring detection
  if (last7Days.some(s => s.snoringDetected)) {
    const snoringNights = last7Days.filter(s => s.snoringDetected).length;
    insights.push({
      id: 'snoring',
      title: '🔊 Snoring Detected',
      message: `Snoring detected on ${snoringNights} night${snoringNights > 1 ? 's' : ''} this week. Consider sleep position changes.`,
      icon: 'Volume2',
      color: '#F59E0B',
      priority: 'medium',
      actionText: 'View Details',
      actionRoute: 'SnoreDetection'
    });
  }

  // 7. Congratulate good sleeper
  if (last7Days.length >= 7) {
    const excellentNights = last7Days.filter(s => s.duration >= 420 && s.duration <= 540 && s.quality >= 7).length;
    if (excellentNights >= 6) {
      insights.push({
        id: 'excellent',
        title: '🏆 Sleep Champion!',
        message: `${excellentNights}/7 nights with excellent sleep! You're doing great!`,
        icon: 'Trophy',
        color: '#10B981',
        priority: 'high'
      });
    }
  }

  // Sort by priority
  return insights.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  }).slice(0, 3); // Return top 3 insights
}
