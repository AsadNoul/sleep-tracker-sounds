import * as Notifications from 'expo-notifications';
import { SleepSession } from '../contexts/SleepContext';
import { getSleepScoreColor } from '../utils/sleepQualityColors';

/**
 * Morning notification service
 * Sends smart notifications in the morning with sleep score and insights
 */

export async function scheduleMorningNotification(session: SleepSession) {
  try {
    // Check if notifications are permitted
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const endTime = session.endTime;
    if (!endTime) return;

    const sleepScore = session.sleepScore || 0;
    const scoreQuality = getSleepScoreColor(sleepScore);
    const durationHours = Math.floor(session.duration / 60);
    const durationMins = session.duration % 60;

    // Schedule notification for 5 minutes after wake up
    const notificationTime = new Date(endTime);
    notificationTime.setMinutes(notificationTime.getMinutes() + 5);

    const title = `${scoreQuality.emoji} Good Morning!`;
    let body = `You slept ${durationHours}h ${durationMins}m`;
    
    if (sleepScore > 0) {
      body += ` • Sleep Score: ${sleepScore}/100 (${scoreQuality.label})`;
    }

    // Add personalized message based on score
    if (sleepScore >= 85) {
      body += '\n🌟 Excellent sleep! You\'re ready to conquer the day!';
    } else if (sleepScore >= 70) {
      body += '\n✨ Good sleep! You should feel refreshed today.';
    } else if (sleepScore >= 60) {
      body += '\n⚠️ Decent sleep, but there\'s room for improvement.';
    } else if (sleepScore > 0) {
      body += '\n😴 Try to get better sleep tonight!';
    }

    // Add wake-up count if relevant
    if (session.wakeUps > 2) {
      body += `\n💤 ${session.wakeUps} wake-ups detected`;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { 
          type: 'morning_summary', 
          sessionId: session.id,
          sleepScore 
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: notificationTime,
    });

    console.log('✅ Morning notification scheduled for:', notificationTime.toLocaleString());
  } catch (error) {
    console.error('❌ Error scheduling morning notification:', error);
  }
}

export async function sendImmediateSleepSummary(session: SleepSession) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const sleepScore = session.sleepScore || 0;
    const scoreQuality = getSleepScoreColor(sleepScore);
    const durationHours = Math.floor(session.duration / 60);
    const durationMins = session.duration % 60;

    const title = `${scoreQuality.emoji} Sleep Session Complete`;
    const body = `${durationHours}h ${durationMins}m sleep • Score: ${sleepScore}/100 (${scoreQuality.label})`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { 
          type: 'sleep_summary', 
          sessionId: session.id 
        },
        sound: 'default',
      },
      trigger: null, // Send immediately
    });

    console.log('✅ Sleep summary notification sent');
  } catch (error) {
    console.error('❌ Error sending sleep summary:', error);
  }
}

export async function scheduleWeeklySummary(sleepSessions: SleepSession[]) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    if (sleepSessions.length === 0) return;

    const avgScore = sleepSessions.reduce((sum, s) => sum + (s.sleepScore || 0), 0) / sleepSessions.length;
    const avgDuration = sleepSessions.reduce((sum, s) => sum + s.duration, 0) / sleepSessions.length;
    const avgHours = Math.floor(avgDuration / 60);
    const avgMins = Math.round(avgDuration % 60);

    const scoreQuality = getSleepScoreColor(avgScore);

    // Schedule for Sunday evening at 8 PM
    const nextSunday = new Date();
    nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
    nextSunday.setHours(20, 0, 0, 0);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 Your Weekly Sleep Summary',
        body: `Avg: ${avgHours}h ${avgMins}m • Score: ${Math.round(avgScore)}/100 (${scoreQuality.label})\nTap to see details and insights!`,
        data: { type: 'weekly_summary' },
        sound: 'default',
      },
      trigger: nextSunday,
    });

    console.log('✅ Weekly summary notification scheduled for:', nextSunday.toLocaleString());
  } catch (error) {
    console.error('❌ Error scheduling weekly summary:', error);
  }
}
