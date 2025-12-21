import { supabase } from '../lib/supabase';

export interface Insight {
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
  correlation?: string;
}

class AIInsightService {
  private static instance: AIInsightService;

  private constructor() {}

  static getInstance(): AIInsightService {
    if (!AIInsightService.instance) {
      AIInsightService.instance = new AIInsightService();
    }
    return AIInsightService.instance;
  }

  async generateInsights(userId: string): Promise<Insight[]> {
    try {
      // Fetch last 7 days of sleep data and lifestyle tags
      const { data: sleepData, error } = await supabase
        .from('sleep_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })
        .limit(14);

      if (error || !sleepData || sleepData.length < 3) {
        return [{
          title: 'Need More Data',
          description: 'Keep tracking your sleep for a few more nights to unlock personalized AI insights.',
          type: 'neutral'
        }];
      }

      const insights: Insight[] = [];

      // 1. Check Caffeine Correlation
      const caffeineNights = sleepData.filter(s => s.tags?.includes('caffeine'));
      const nonCaffeineNights = sleepData.filter(s => !s.tags?.includes('caffeine'));

      if (caffeineNights.length > 0 && nonCaffeineNights.length > 0) {
        const avgCaffeineScore = caffeineNights.reduce((acc, s) => acc + (s.sleep_score || 0), 0) / caffeineNights.length;
        const avgNormalScore = nonCaffeineNights.reduce((acc, s) => acc + (s.sleep_score || 0), 0) / nonCaffeineNights.length;

        if (avgNormalScore - avgCaffeineScore > 5) {
          insights.push({
            title: 'Caffeine Impact',
            description: `Your sleep score is ${Math.round(avgNormalScore - avgCaffeineScore)} points lower on days you consume caffeine.`,
            type: 'negative',
            correlation: 'caffeine'
          });
        }
      }

      // 2. Check Exercise Correlation
      const exerciseNights = sleepData.filter(s => s.tags?.includes('exercise'));
      if (exerciseNights.length > 0) {
        const avgExerciseScore = exerciseNights.reduce((acc, s) => acc + (s.sleep_score || 0), 0) / exerciseNights.length;
        const avgOverallScore = sleepData.reduce((acc, s) => acc + (s.sleep_score || 0), 0) / sleepData.length;

        if (avgExerciseScore > avgOverallScore + 3) {
          insights.push({
            title: 'Exercise Boost',
            description: 'Great job! You tend to get deeper sleep on days when you exercise.',
            type: 'positive',
            correlation: 'exercise'
          });
        }
      }

      // 3. Consistency Check
      const bedtimes = sleepData.map(s => new Date(s.start_time).getHours());
      const variance = this.calculateVariance(bedtimes);
      if (variance < 1) {
        insights.push({
          title: 'Perfect Consistency',
          description: 'Your bedtime is very consistent. This helps regulate your circadian rhythm.',
          type: 'positive'
        });
      } else if (variance > 2) {
        insights.push({
          title: 'Irregular Bedtime',
          description: 'Your bedtime varies by over 2 hours. Try to stick to a schedule for better quality.',
          type: 'negative'
        });
      }

      return insights.length > 0 ? insights : [{
        title: 'Stable Sleep',
        description: 'Your sleep patterns look stable. Keep maintaining your current routine!',
        type: 'positive'
      }];
    } catch (error) {
      console.error('Error generating insights:', error);
      return [];
    }
  }

  analyzeCorrelations(history: any[]): any[] {
    if (!history || history.length < 5) return [];

    const tags = ['caffeine', 'exercise', 'alcohol', 'meditation', 'screen time', 'stress'];
    const results: any[] = [];

    tags.forEach(tag => {
      const withTag = history.filter(s => s.tags?.includes(tag));
      const withoutTag = history.filter(s => !s.tags?.includes(tag));

      if (withTag.length >= 2 && withoutTag.length >= 2) {
        const avgWith = withTag.reduce((acc, s) => acc + (s.sleepScore || s.quality * 10), 0) / withTag.length;
        const avgWithout = withoutTag.reduce((acc, s) => acc + (s.sleepScore || s.quality * 10), 0) / withoutTag.length;
        
        const correlation = (avgWith - avgWithout) / 100;
        if (Math.abs(correlation) > 0.02) {
          results.push({
            tag: tag.charAt(0).toUpperCase() + tag.slice(1),
            correlation: correlation
          });
        }
      }
    });

    return results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((acc, n) => acc + n, 0) / numbers.length;
    const squareDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return Math.sqrt(squareDiffs.reduce((acc, n) => acc + n, 0) / numbers.length);
  }
}

export default AIInsightService.getInstance();
