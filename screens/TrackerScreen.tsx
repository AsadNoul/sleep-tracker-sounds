import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { loadUserAge, saveUserAge } from '../utils/storage';
import { format12HourTime } from '../utils/dateFormatting';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  Main: undefined;
  SleepSession: undefined;
  Subscription: undefined;
  HelpSupport: undefined;
  PrivacySettings: undefined;
};

export default function TrackerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [sleepSounds, setSleepSounds] = useState(false);
  const [alarm, setAlarm] = useState(true);
  const [sleepRecorder, setSleepRecorder] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userAge, setUserAge] = useState(25);

  // Load user age on mount
  useEffect(() => {
    const loadAge = async () => {
      const age = await loadUserAge();
      if (age !== null) {
        setUserAge(age);
      } else {
        // Set default age and save it
        await saveUserAge(25);
      }
    };
    loadAge();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getSleepRecommendation = () => {
    if (userAge < 18) return '8-10 hours';
    if (userAge < 65) return '7-9 hours';
    return '7-8 hours';
  };

  const navigateToSleepSession = () => {
    navigation.navigate('SleepSession');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F111A', '#1B1D2A']}
        style={styles.gradient}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Image source={require('../assets/icon.png')} style={styles.logo} />
            <Text style={styles.greeting}>Good evening</Text>
            <Text style={styles.time}>
              {format12HourTime(currentTime)}
            </Text>
          </View>

          {/* Sleep Quality Card */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Sleep Quality</Text>
              <View style={styles.qualityBadge}>
                <Text style={styles.qualityText}>Good</Text>
              </View>
            </View>
            <View style={styles.sleepStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>7h 32m</Text>
                <Text style={styles.statLabel}>Last Night</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>8.2</Text>
                <Text style={styles.statLabel}>Sleep Score</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>2x</Text>
                <Text style={styles.statLabel}>Woke Up</Text>
              </View>
            </View>
          </BlurView>

          {/* Sleep Controls */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.cardTitle}>Sleep Controls</Text>
            
            <View style={styles.controlItem}>
              <View style={styles.controlInfo}>
                <Ionicons name="musical-notes" size={24} color="#00FFD1" />
                <Text style={styles.controlLabel}>Sleep Sounds</Text>
              </View>
              <Switch
                value={sleepSounds}
                onValueChange={setSleepSounds}
                trackColor={{ false: '#333', true: '#00FFD1' }}
                thumbColor={sleepSounds ? '#fff' : '#ccc'}
              />
            </View>

            <View style={styles.controlItem}>
              <View style={styles.controlInfo}>
                <Ionicons name="alarm" size={24} color="#33C6FF" />
                <Text style={styles.controlLabel}>Smart Alarm</Text>
              </View>
              <Switch
                value={alarm}
                onValueChange={setAlarm}
                trackColor={{ false: '#333', true: '#33C6FF' }}
                thumbColor={alarm ? '#fff' : '#ccc'}
              />
            </View>

            <View style={styles.controlItem}>
              <View style={styles.controlInfo}>
                <Ionicons name="mic" size={24} color="#FF6B6B" />
                <Text style={styles.controlLabel}>Sleep Recorder</Text>
              </View>
              <Switch
                value={sleepRecorder}
                onValueChange={setSleepRecorder}
                trackColor={{ false: '#333', true: '#FF6B6B' }}
                thumbColor={sleepRecorder ? '#fff' : '#ccc'}
              />
            </View>
          </BlurView>

          {/* Sleep Recommendation */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="bulb" size={24} color="#FFD700" />
              <Text style={styles.cardTitle}>Sleep Recommendation</Text>
            </View>
            <Text style={styles.recommendationText}>
              Based on your age and sleep patterns, you should aim for{' '}
              <Text style={styles.highlightText}>{getSleepRecommendation()}</Text> of sleep tonight.
            </Text>
            <Text style={styles.tipText}>
              💡 Try going to bed by 10:30 PM to get optimal rest
            </Text>
          </BlurView>

          {/* Sleep Now Button */}
          <TouchableOpacity 
            style={styles.sleepButton}
            onPress={navigateToSleepSession}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#00FFD1', '#33C6FF']}
              style={styles.sleepButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="moon" size={24} color="#000" />
              <Text style={styles.sleepButtonText}>Sleep Now</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F111A',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  logo: {
    width: 48,
    height: 48,
    marginBottom: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  time: {
    fontSize: 16,
    color: '#A0AEC0',
  },
  card: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  qualityBadge: {
    backgroundColor: '#00FFD1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  sleepStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00FFD1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  controlInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  recommendationText: {
    fontSize: 16,
    color: '#A0AEC0',
    lineHeight: 24,
    marginBottom: 10,
  },
  highlightText: {
    color: '#00FFD1',
    fontWeight: '600',
  },
  tipText: {
    fontSize: 14,
    color: '#FFD700',
    fontStyle: 'italic',
  },
  sleepButton: {
    marginTop: 10,
    marginBottom: 20,
  },
  sleepButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
  },
  sleepButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 20,
  },
});