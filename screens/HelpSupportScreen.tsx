import { useAppTheme } from '../hooks/useAppTheme';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ChevronLeft,
  HelpCircle,
  Mail,
  ChevronUp,
  ChevronDown,
  Clock,
  Twitter,
  Send,
  Crown,
  Lock,
  Zap
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { isPremiumActive } from '../utils/subscriptionHelpers';
import analyticsService from '../services/analyticsService';

const { width } = Dimensions.get('window');


// FAQ data
const faqs = [
  {
    id: 'faq-tracking',
    question: 'How does sleep tracking work?',
    answer: 'Tap "Sleep Now" on the Home screen to start a session. The app tracks your sleep duration in real-time. When you wake up, tap "End Sleep Session" and enter your wake-up count. Your sleep quality is automatically calculated based on duration (ideal 7-9 hours) and wake-ups.'
  },
  {
    id: 'faq-quality',
    question: 'How is sleep quality calculated?',
    answer: 'Sleep quality starts at 10/10 and is adjusted based on: (1) Sleep duration - penalty for less than 7 hours or more than 9 hours, (2) Wake-ups - each wake-up reduces quality by 1 point. The final score ranges from 0-10, with 8+ being Excellent, 6-7.9 being Good, 4-5.9 being Fair, and below 4 being Poor.'
  },
  {
    id: 'faq-data',
    question: 'Where is my sleep data stored?',
    answer: 'All your sleep data is stored locally on your device using secure storage. Your data never leaves your device unless you explicitly export it. You can export all your data at any time from Settings > Data & Privacy > Export My Data.'
  },
  {
    id: 'faq-history',
    question: 'How do I view my sleep history?',
    answer: 'Go to the Journal tab to see your sleep history, analytics, and weekly patterns. You can view your average sleep duration, quality scores, recent sessions, and a visual weekly chart showing your sleep patterns over the last 7 days.'
  },
  {
    id: 'faq-active',
    question: 'What if I close the app during sleep tracking?',
    answer: 'Your active sleep session is automatically saved and will continue even if you close the app or restart your device. When you open the app again, you\'ll see your ongoing session with the updated elapsed time.'
  },
  {
    id: 'faq-delete',
    question: 'How do I delete my sleep data?',
    answer: 'You can delete all your data by going to Settings > Data & Privacy > Delete Account. This will permanently remove all your sleep sessions, analytics, and personal information. This action cannot be undone.'
  },
  {
    id: 'faq-sounds',
    question: 'Do sleep sounds play during tracking?',
    answer: 'Currently, sleep sounds are a placeholder feature for future updates. When enabled in the sleep session settings, they will be indicated during tracking, but audio playback is not yet implemented. This feature is coming soon!'
  },
  {
    id: 'faq-privacy',
    question: 'Is my sleep data private?',
    answer: 'Yes! All your sleep data is stored locally on your device only. We never send your data to external servers. You have full control to export or delete your data at any time from the Settings screen.'
  },
  {
    id: 'faq-accuracy',
    question: 'How can I improve tracking accuracy?',
    answer: 'For best results: (1) Start the session right before you sleep, (2) End the session immediately when you wake up, (3) Accurately count your wake-ups during the night, (4) Keep your phone plugged in, (5) Use the app consistently to build accurate trends over time.'
  },
  {
    id: 'faq-export',
    question: 'How do I export my sleep data?',
    answer: 'Go to Settings > Data & Privacy > Export My Data. This will create a JSON file containing all your sleep sessions and data. You can then save it to your device or share it via any app of your choice.'
  },
];

export default function HelpSupportScreen() {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { profile } = useAuth();
  const isPremium = isPremiumActive(profile?.subscription_status, profile?.subscription_end_date, profile?.role, profile?.email);
  const [activeTab, setActiveTab] = useState('faq');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Toggle FAQ expansion
  const toggleFaq = (index) => {
    if (expandedFaq === index) {
      setExpandedFaq(null);
    } else {
      setExpandedFaq(index);
    }
  };
  
  // Handle contact form submission
  const handleSubmit = async () => {
    // Validate form
    if (!name.trim() || !email.trim() || !message.trim() || !subject.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsSending(true);

    try {
      // Use mailto so users can send via their email client without backend dependency
      const mailto = `mailto:asadalibscs20@gmail.com?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(
        `From: ${name.trim()} <${email.trim()}>\n\n${message.trim()}\n\nSent from Sleep Architect`
      )}`;

      const supported = await Linking.canOpenURL(mailto);
      if (!supported) {
        throw new Error('No email client available');
      }

      await Linking.openURL(mailto);

      Alert.alert(
        'Ready to Send',
        'We opened your email app with your message. Please press send to complete.',
        [{
          text: 'OK',
          onPress: () => {
            setName('');
            setEmail('');
            setMessage('');
            setSubject('');
          }
        }]
      );
    } catch (error) {
      console.error('Contact form error:', error);
      Alert.alert(
        'Error',
        'Failed to send message. Please email us directly at asadalibscs20@gmail.com'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles(theme).container} edges={['top']}>
      <LinearGradient
        colors={[theme.colors.background, '#0A0C14']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles(theme).header}>
        <TouchableOpacity 
          style={styles(theme).backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles(theme).title}>Help & Support</Text>
        <View style={styles(theme).placeholder} />
      </View>
      
      {/* Tab Selector */}
      <View style={styles(theme).tabContainer}>
        <TouchableOpacity
          style={[styles(theme).tab, activeTab === 'faq' && styles(theme).activeTab]}
          onPress={() => setActiveTab('faq')}
        >
          <HelpCircle
            size={20}
            color={activeTab === 'faq' ? theme.colors.accent : theme.colors.textSecondary}
          />
          <Text style={[styles(theme).tabText, activeTab === 'faq' && styles(theme).activeTabText]}>
            FAQ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles(theme).tab, activeTab === 'contact' && styles(theme).activeTab]}
          onPress={() => setActiveTab('contact')}
        >
          <Mail
            size={20}
            color={activeTab === 'contact' ? theme.colors.accent : theme.colors.textSecondary}
          />
          <Text style={[styles(theme).tabText, activeTab === 'contact' && styles(theme).activeTabText]}>
            Contact Us
          </Text>
        </TouchableOpacity>

        {/* VIP Support tab — premium only */}
        <TouchableOpacity
          style={[styles(theme).tab, styles(theme).vipTab, activeTab === 'vip' && styles(theme).vipTabActive]}
          onPress={() => {
            if (!isPremium) {
              analyticsService.trackFeatureGateHit('vip_support');
              navigation.navigate('Subscription', { source: 'vip_support' });
              return;
            }
            setActiveTab('vip');
            analyticsService.trackEvent('vip_support_opened');
          }}
        >
          {isPremium
            ? <Crown size={18} color={activeTab === 'vip' ? '#F59E0B' : '#F59E0B'} />
            : <Lock size={16} color="#F59E0B" />}
          <Text style={[styles(theme).tabText, styles(theme).vipTabText, activeTab === 'vip' && styles(theme).vipTabActiveText]}>
            VIP
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles(theme).content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles(theme).scrollContent,
          { 
            paddingBottom: insets.bottom + 100 
          }
        ]}
      >
        {activeTab === 'faq' ? (
          <View style={styles(theme).faqContainer}>
            <Text style={styles(theme).sectionDescription}>
              Find answers to commonly asked questions about our app and services.
            </Text>
            
            {faqs.map((faq) => (
              <TouchableOpacity
                key={faq.id}
                style={[
                  styles(theme).faqItem,
                  expandedFaq === faq.id && styles(theme).expandedFaqItem
                ]}
                onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                activeOpacity={0.8}
              >
                <BlurView intensity={20} style={styles(theme).faqBlur}>
                  <View style={styles(theme).faqHeader}>
                    <Text style={styles(theme).faqQuestion}>{faq.question}</Text>
                    {expandedFaq === faq.id ? (
                      <ChevronUp size={20} color={theme.colors.textSecondary} />
                    ) : (
                      <ChevronDown size={20} color={theme.colors.textSecondary} />
                    )}
                  </View>

                  {expandedFaq === faq.id && (
                    <View style={styles(theme).faqAnswer}>
                      <Text style={styles(theme).faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </BlurView>
              </TouchableOpacity>
            ))}
            
            <View style={styles(theme).moreHelpSection}>
              <Text style={styles(theme).moreHelpTitle}>Need More Help?</Text>
              <Text style={styles(theme).moreHelpText}>
                If you couldn't find the answer to your question, please contact our support team.
              </Text>
              <TouchableOpacity 
                style={styles(theme).contactButton}
                onPress={() => setActiveTab('contact')}
              >
                <LinearGradient
                  colors={[theme.colors.accent, theme.colors.highlight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles(theme).contactButtonGradient}
                >
                  <Text style={styles(theme).contactButtonText}>Contact Support</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles(theme).contactContainer}>
            <Text style={styles(theme).sectionDescription}>
              Have a question or need assistance? Fill out the form below and our support team will get back to you as soon as possible.
            </Text>
            
            <View style={styles(theme).formContainer}>
              <View style={styles(theme).inputGroup}>
                <Text style={styles(theme).inputLabel}>Name</Text>
                <TextInput
                  style={styles(theme).input}
                  placeholder="Your name"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
              </View>
              
              <View style={styles(theme).inputGroup}>
                <Text style={styles(theme).inputLabel}>Email</Text>
                <TextInput
                  style={styles(theme).input}
                  placeholder="your.email@example.com"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              
              <View style={styles(theme).inputGroup}>
                <Text style={styles(theme).inputLabel}>Subject</Text>
                <TextInput
                  style={styles(theme).input}
                  placeholder="What is this regarding?"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>
              
              <View style={styles(theme).inputGroup}>
                <Text style={styles(theme).inputLabel}>Message</Text>
                <TextInput
                  style={[styles(theme).input, styles(theme).messageInput]}
                  placeholder="Please describe your issue or question in detail"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  value={message}
                  onChangeText={setMessage}
                />
              </View>
              
              <TouchableOpacity 
                style={[styles(theme).submitButton, isSending && styles(theme).disabledButton]}
                onPress={handleSubmit}
                disabled={isSending}
              >
                <LinearGradient
                  colors={[theme.colors.accent, theme.colors.highlight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles(theme).submitButtonGradient}
                >
                  {isSending ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles(theme).submitButtonText}>Send Message</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            <View style={styles(theme).alternativeContactSection}>
              <Text style={styles(theme).alternativeContactTitle}>Other Ways to Reach Us</Text>
              
              <View style={styles(theme).contactMethodsContainer}>
                <View style={styles(theme).contactMethod}>
                  <View style={styles(theme).contactMethodIcon}>
                    <Mail size={24} color={theme.colors.accent} />
                  </View>
                  <View>
                    <Text style={styles(theme).contactMethodTitle}>Email</Text>
                    <Text style={styles(theme).contactMethodValue}>support@sleepapp.com</Text>
                  </View>
                </View>
                
                <View style={styles(theme).contactMethod}>
                  <View style={styles(theme).contactMethodIcon}>
                    <Clock size={24} color={theme.colors.accent} />
                  </View>
                  <View>
                    <Text style={styles(theme).contactMethodTitle}>Response Time</Text>
                    <Text style={styles(theme).contactMethodValue}>Within 24 hours</Text>
                  </View>
                </View>
                
                <View style={styles(theme).contactMethod}>
                  <View style={styles(theme).contactMethodIcon}>
                    <Twitter size={24} color={theme.colors.accent} />
                  </View>
                  <TouchableOpacity onPress={() => Linking.openURL('https://x.com/mxsports5')}>
                    <Text style={styles(theme).contactMethodTitle}>X (Twitter)</Text>
                    <Text style={styles(theme).contactMethodValue}>@Sleeptracker</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles(theme).contactMethod}>
                  <View style={styles(theme).contactMethodIcon}>
                    <Send size={24} color={theme.colors.accent} />
                  </View>
                  <TouchableOpacity onPress={() => Linking.openURL('https://t.me/asadalinaul1')}>
                    <Text style={styles(theme).contactMethodTitle}>Telegram</Text>
                    <Text style={styles(theme).contactMethodValue}>t.me/asadalinaul1</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
        
        {activeTab === 'vip' && isPremium && (
          <View style={styles(theme).vipContainer}>
            {/* VIP hero */}
            <LinearGradient colors={['rgba(245,158,11,0.15)', 'rgba(245,158,11,0.04)']} style={styles(theme).vipHero}>
              <Crown size={40} color="#F59E0B" />
              <Text style={styles(theme).vipHeroTitle}>VIP Priority Support</Text>
              <Text style={styles(theme).vipHeroSubtitle}>As a Premium member you get priority responses within 2 hours</Text>
            </LinearGradient>

            {/* Priority email */}
            <View style={styles(theme).vipCard}>
              <View style={styles(theme).vipCardHeader}>
                <View style={styles(theme).vipIconBox}><Zap size={20} color="#F59E0B" /></View>
                <Text style={styles(theme).vipCardTitle}>Priority Email Support</Text>
              </View>
              <Text style={styles(theme).vipCardDesc}>Send us your issue and we'll reply within 2 hours (Mon-Fri).</Text>
              <TouchableOpacity
                style={styles(theme).vipActionBtn}
                onPress={() => Linking.openURL('mailto:vip@sleeparchitect.app?subject=VIP Support Request&body=Premium Member - Priority Support')}
              >
                <LinearGradient colors={['#F59E0B', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles(theme).vipActionGradient}>
                  <Text style={styles(theme).vipActionText}>Email VIP Support</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Telegram VIP */}
            <View style={styles(theme).vipCard}>
              <View style={styles(theme).vipCardHeader}>
                <View style={styles(theme).vipIconBox}><Send size={20} color="#F59E0B" /></View>
                <Text style={styles(theme).vipCardTitle}>VIP Telegram Chat</Text>
              </View>
              <Text style={styles(theme).vipCardDesc}>Join our private VIP Telegram group for direct developer access.</Text>
              <TouchableOpacity
                style={styles(theme).vipActionBtn}
                onPress={() => Linking.openURL('https://t.me/sleeparchitectvip')}
              >
                <LinearGradient colors={['#F59E0B', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles(theme).vipActionGradient}>
                  <Text style={styles(theme).vipActionText}>Join VIP Group</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Response times */}
            <View style={styles(theme).vipCard}>
              <Text style={styles(theme).vipCardTitle}>Response Times</Text>
              {[
                { label: 'VIP Priority Email', value: '< 2 hours', color: '#10B981' },
                { label: 'VIP Telegram', value: '< 1 hour', color: '#10B981' },
                { label: 'Standard Email', value: '24-48 hours', color: 'rgba(255,255,255,0.4)' },
              ].map((row, i) => (
                <View key={i} style={styles(theme).responseRow}>
                  <Text style={styles(theme).responseLabel}>{row.label}</Text>
                  <Text style={[styles(theme).responseValue, { color: row.color }]}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom padding for tab bar */}
        <View style={styles(theme).bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
  },
  activeTab: {
    backgroundColor: 'rgba(0, 255, 209, 0.15)',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  activeTabText: {
    color: theme.colors.accent,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  faqContainer: {
    marginBottom: 20,
  },
  faqItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(51, 198, 255, 0.1)',
  },
  expandedFaqItem: {
    borderColor: theme.colors.accent,
  },
  faqBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  faqAnswer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 198, 255, 0.1)',
  },
  faqAnswerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  moreHelpSection: {
    marginTop: 30,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
  },
  moreHelpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  moreHelpText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  contactButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  contactButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  contactContainer: {
    marginBottom: 20,
  },
  formContainer: {
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(15, 17, 26, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(51, 198, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  alternativeContactSection: {
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    borderRadius: 16,
    padding: 20,
  },
  alternativeContactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  contactMethodsContainer: {
    marginBottom: 10,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactMethodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  contactMethodValue: {
    fontSize: 14,
    color: theme.colors.highlight,
  },
  bottomPadding: {
    height: 100,
  },

  // VIP tab styles
  vipTab: { borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.08)' },
  vipTabActive: { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: '#F59E0B' },
  vipTabText: { color: '#F59E0B' },
  vipTabActiveText: { color: '#F59E0B' },

  // VIP screen
  vipContainer: { paddingBottom: 20 },
  vipHero: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  vipHeroTitle: { fontSize: 20, fontWeight: '900', color: '#F59E0B', marginTop: 12, marginBottom: 6 },
  vipHeroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 18 },
  vipCard: { backgroundColor: 'rgba(27,29,42,0.7)', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)' },
  vipCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  vipIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(245,158,11,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  vipCardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  vipCardDesc: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18, marginBottom: 14 },
  vipActionBtn: { borderRadius: 12, overflow: 'hidden' },
  vipActionGradient: { paddingVertical: 12, alignItems: 'center' },
  vipActionText: { fontSize: 14, fontWeight: '700', color: '#000' },
  responseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  responseLabel: { fontSize: 13, color: theme.colors.textSecondary },
  responseValue: { fontSize: 13, fontWeight: '700' },
});
