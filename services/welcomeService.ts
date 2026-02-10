import { supabase } from '../lib/supabase';
import notificationService from './notificationService';

/**
 * Welcome Service - Personalized onboarding for new users
 */
class WelcomeService {
  /**
   * Send welcome notification to new user
   */
  async sendWelcomeNotification(userId: string, userName?: string) {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('expo_push_token, full_name')
        .eq('id', userId)
        .single();

      if (!profile?.expo_push_token) {
        console.log('No push token for new user, skipping welcome notification');
        return;
      }

      const name = userName || profile.full_name || 'there';
      
      await notificationService.sendPushNotification(
        profile.expo_push_token,
        `Welcome to Sleep Tracker, ${name}! 🌙`,
        'Start your journey to better sleep. Track your first night and see insights!',
        { 
          type: 'welcome',
          screen: 'Home'
        }
      );

      console.log('✅ Welcome notification sent to:', userId);
    } catch (error) {
      console.error('Error sending welcome notification:', error);
    }
  }

  /**
   * Send milestone notifications (1st session, 7 days, 30 days, etc.)
   */
  async checkAndSendMilestones(userId: string) {
    try {
      const { data: sessions } = await supabase
        .from('sleep_records')
        .select('id')
        .eq('user_id', userId);

      const sessionCount = sessions?.length || 0;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('expo_push_token, full_name')
        .eq('id', userId)
        .single();

      if (!profile?.expo_push_token) return;

      const name = profile.full_name || 'there';

      // Milestone notifications
      if (sessionCount === 1) {
        await notificationService.sendPushNotification(
          profile.expo_push_token,
          '🎉 First Night Tracked!',
          `Great job, ${name}! Check your sleep insights and see how you did.`,
          { type: 'milestone', screen: 'Journal' }
        );
      } else if (sessionCount === 7) {
        await notificationService.sendPushNotification(
          profile.expo_push_token,
          '🔥 7-Day Streak!',
          `Amazing ${name}! You've tracked a full week. Keep it up!`,
          { type: 'milestone', screen: 'Journal' }
        );
      } else if (sessionCount === 30) {
        await notificationService.sendPushNotification(
          profile.expo_push_token,
          '🏆 30-Day Milestone!',
          `Incredible ${name}! One month of sleep tracking. You're a sleep champion!`,
          { type: 'milestone', screen: 'Achievements' }
        );
      }

      console.log(`✅ Milestone check complete for user ${userId}: ${sessionCount} sessions`);
    } catch (error) {
      console.error('Error checking milestones:', error);
    }
  }

  /**
   * Send personalized tip based on sleep data
   */
  async sendPersonalizedTip(userId: string) {
    try {
      const { data: recentSessions } = await supabase
        .from('sleep_records')
        .select('sleep_quality, total_sleep_hours, sleep_score')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(7);

      if (!recentSessions || recentSessions.length < 3) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('expo_push_token, full_name')
        .eq('id', userId)
        .single();

      if (!profile?.expo_push_token) return;

      const avgSleepHours = recentSessions.reduce((sum, s) => sum + (s.total_sleep_hours || 0), 0) / recentSessions.length;
      const avgScore = recentSessions.reduce((sum, s) => sum + (s.sleep_score || 0), 0) / recentSessions.length;

      let tip = '';
      
      if (avgSleepHours < 6) {
        tip = '💤 Your sleep duration is low. Try going to bed 30 minutes earlier tonight!';
      } else if (avgSleepHours > 9) {
        tip = '⏰ You might be oversleeping. Try setting a consistent wake time!';
      } else if (avgScore < 60) {
        tip = '🌙 Your sleep quality could improve. Try our relaxation sounds tonight!';
      } else if (avgScore > 80) {
        tip = '🌟 Your sleep is excellent! Keep maintaining your healthy routine!';
      }

      if (tip) {
        await notificationService.sendPushNotification(
          profile.expo_push_token,
          'Your Weekly Sleep Tip',
          tip,
          { type: 'tip', screen: 'Home' }
        );

        console.log('✅ Personalized tip sent to:', userId);
      }
    } catch (error) {
      console.error('Error sending personalized tip:', error);
    }
  }

  /**
   * Encourage inactive users to come back
   */
  async sendReEngagementNotification(userId: string) {
    try {
      const { data: lastSession } = await supabase
        .from('sleep_records')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!lastSession) return;

      const daysSinceLastSession = Math.floor(
        (Date.now() - new Date(lastSession.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastSession < 7) return; // Only send if inactive for 7+ days

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('expo_push_token, full_name')
        .eq('id', userId)
        .single();

      if (!profile?.expo_push_token) return;

      const name = profile.full_name || 'there';

      await notificationService.sendPushNotification(
        profile.expo_push_token,
        `We miss you, ${name}! 😴`,
        `It's been ${daysSinceLastSession} days. Ready to track your sleep again?`,
        { type: 're-engagement', screen: 'Home' }
      );

      console.log('✅ Re-engagement notification sent to:', userId);
    } catch (error) {
      console.error('Error sending re-engagement notification:', error);
    }
  }
}

export default new WelcomeService();
