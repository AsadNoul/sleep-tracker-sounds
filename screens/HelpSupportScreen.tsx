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
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Search,
  Mail,
  Bug,
  Lightbulb,
  Clock,
  Twitter,
  Send,
  Crown,
  Lock,
  Zap,
  Headphones,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { isPremiumActive } from '../utils/subscriptionHelpers';
import analyticsService from '../services/analyticsService';

// FAQ data — unchanged content, now rendered as a single accordion card
// matching the canvas's "Common questions" group (Ac-Help.dc.html).
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
  const { theme } = useAppTheme();
  const s = styles(theme);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { profile } = useAuth();
  const isPremium = isPremiumActive(profile?.subscription_status, profile?.subscription_end_date, profile?.role, profile?.email);
  const [activeTab, setActiveTab] = useState('faq');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isSending, setIsSending] = useState(false);

  const filteredFaqs = search.trim()
    ? faqs.filter((faq) =>
        faq.question.toLowerCase().includes(search.trim().toLowerCase()) ||
        faq.answer.toLowerCase().includes(search.trim().toLowerCase())
      )
    : faqs;

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
      const mailto = `mailto:support@naulx.com?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(
        `From: ${name.trim()} <${email.trim()}>\n\n${message.trim()}\n\nSent from Nightprint`
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
        'Failed to send message. Please email us directly at support@naulx.com'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleReportBug = () => {
    setActiveTab('contact');
    setSubject('Bug report');
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back"
        >
          <ChevronLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Help &amp; support</Text>
      </View>

      {/* Tab Selector */}
      <View style={s.tabContainer}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'faq' && s.activeTab]}
          onPress={() => setActiveTab('faq')}
        >
          <Text style={[s.tabText, activeTab === 'faq' && s.activeTabText]}>FAQ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tab, activeTab === 'contact' && s.activeTab]}
          onPress={() => setActiveTab('contact')}
        >
          <Text style={[s.tabText, activeTab === 'contact' && s.activeTabText]}>Contact Us</Text>
        </TouchableOpacity>

        {/* VIP Support tab — premium only */}
        <TouchableOpacity
          style={[s.tab, s.vipTab, activeTab === 'vip' && s.vipTabActive]}
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
            ? <Crown size={16} color={theme.colors.premium} />
            : <Lock size={14} color={theme.colors.premium} />}
          <Text style={[s.tabText, s.vipTabText]}>VIP</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {activeTab === 'faq' ? (
          <View>
            {/* Search — canvas's search input, wired to filter the FAQ list below */}
            <View style={s.searchWrap}>
              <Search size={18} color={theme.colors.textTertiary} style={s.searchIcon} />
              <TextInput
                style={s.searchInput}
                placeholder="Search for help"
                placeholderTextColor={theme.colors.textTertiary}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <Text style={s.sectionLabel}>Common questions</Text>
            <View style={s.faqCard}>
              {filteredFaqs.length === 0 ? (
                <Text style={s.emptyText}>No results for "{search.trim()}"</Text>
              ) : (
                filteredFaqs.map((faq, index) => {
                  const isExpanded = expandedFaq === faq.id;
                  const isLast = index === filteredFaqs.length - 1;
                  return (
                    <View key={faq.id} style={[s.faqRow, !isLast && s.faqRowDivider]}>
                      <TouchableOpacity
                        style={s.faqHeader}
                        onPress={() => setExpandedFaq(isExpanded ? null : faq.id)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: isExpanded }}
                      >
                        <Text style={s.faqQuestion}>{faq.question}</Text>
                        {isExpanded ? (
                          <ChevronUp size={18} color={theme.colors.textTertiary} />
                        ) : (
                          <ChevronDown size={18} color={theme.colors.textTertiary} />
                        )}
                      </TouchableOpacity>
                      {isExpanded && (
                        <Text style={s.faqAnswer}>{faq.answer}</Text>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            {/* Still stuck — canvas's 3-up action grid (Email us / Report a bug / Suggest idea) */}
            <Text style={[s.sectionLabel, s.stuckLabel]}>Still stuck?</Text>
            <View style={s.stuckGrid}>
              <TouchableOpacity style={s.stuckTile} onPress={() => setActiveTab('contact')} activeOpacity={0.8}>
                <Mail size={20} color={theme.colors.accent} />
                <Text style={s.stuckTileText}>Email us</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.stuckTile} onPress={handleReportBug} activeOpacity={0.8}>
                <Bug size={20} color={theme.colors.accent} />
                <Text style={s.stuckTileText}>Report a bug</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.stuckTile}
                onPress={() => Linking.openURL('mailto:support@naulx.com?subject=Feature%20idea')}
                activeOpacity={0.8}
              >
                <Lightbulb size={20} color={theme.colors.accent} />
                <Text style={s.stuckTileText}>Suggest idea</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.footerHint}>We usually reply within one working day.</Text>
          </View>
        ) : activeTab === 'contact' ? (
          <View>
            <Text style={s.sectionDescription}>
              Have a question or need assistance? Fill out the form below and our support team will get back to you as soon as possible.
            </Text>

            <View style={s.formCard}>
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Name</Text>
                <TextInput
                  style={s.input}
                  placeholder="Your name"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Email</Text>
                <TextInput
                  style={s.input}
                  placeholder="your.email@example.com"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Subject</Text>
                <TextInput
                  style={s.input}
                  placeholder="What is this regarding?"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Message</Text>
                <TextInput
                  style={[s.input, s.messageInput]}
                  placeholder="Please describe your issue or question in detail"
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  value={message}
                  onChangeText={setMessage}
                />
              </View>

              <TouchableOpacity
                style={[s.submitButton, isSending && s.disabledButton]}
                onPress={handleSubmit}
                disabled={isSending}
                activeOpacity={0.85}
              >
                {isSending ? (
                  <ActivityIndicator color={theme.colors.ctaText} size="small" />
                ) : (
                  <Text style={s.submitButtonText}>Send Message</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={s.sectionLabel}>Other ways to reach us</Text>
            <View style={s.methodsCard}>
              <View style={[s.methodRow, s.methodRowDivider]}>
                <View style={s.methodIcon}>
                  <Mail size={20} color={theme.colors.accent} />
                </View>
                <View style={s.methodTextBlock}>
                  <Text style={s.methodTitle}>Email</Text>
                  <Text style={s.methodValue}>support@naulx.com</Text>
                </View>
              </View>

              <View style={[s.methodRow, s.methodRowDivider]}>
                <View style={s.methodIcon}>
                  <Clock size={20} color={theme.colors.accent} />
                </View>
                <View style={s.methodTextBlock}>
                  <Text style={s.methodTitle}>Response Time</Text>
                  <Text style={s.methodValue}>Within 24 hours</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[s.methodRow, s.methodRowDivider]}
                onPress={() => Linking.openURL('https://x.com/mxsports5')}
                activeOpacity={0.7}
              >
                <View style={s.methodIcon}>
                  <Twitter size={20} color={theme.colors.accent} />
                </View>
                <View style={s.methodTextBlock}>
                  <Text style={s.methodTitle}>X (Twitter)</Text>
                  <Text style={s.methodValue}>@mxsports5</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.methodRow}
                onPress={() => Linking.openURL('https://t.me/asadalinaul1')}
                activeOpacity={0.7}
              >
                <View style={s.methodIcon}>
                  <Send size={20} color={theme.colors.accent} />
                </View>
                <View style={s.methodTextBlock}>
                  <Text style={s.methodTitle}>Telegram</Text>
                  <Text style={s.methodValue}>t.me/asadalinaul1</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          isPremium && (
            <View>
              {/* VIP hero */}
              <View style={s.vipHero}>
                <Crown size={36} color={theme.colors.premium} />
                <Text style={s.vipHeroTitle}>VIP Priority Support</Text>
                <Text style={s.vipHeroSubtitle}>As a Premium member you get priority responses within 2 hours</Text>
              </View>

              {/* Priority email */}
              <View style={s.vipCard}>
                <View style={s.vipCardHeader}>
                  <View style={s.vipIconBox}><Zap size={18} color={theme.colors.premium} /></View>
                  <Text style={s.vipCardTitle}>Priority Email Support</Text>
                </View>
                <Text style={s.vipCardDesc}>Send us your issue and we'll reply within 2 hours (Mon-Fri).</Text>
                <TouchableOpacity
                  style={s.vipActionBtn}
                  onPress={() => Linking.openURL('mailto:support@naulx.com?subject=VIP Support Request&body=Premium Member - Priority Support')}
                  activeOpacity={0.85}
                >
                  <Text style={s.vipActionText}>Email VIP Support</Text>
                </TouchableOpacity>
              </View>

              {/* Telegram VIP */}
              <View style={s.vipCard}>
                <View style={s.vipCardHeader}>
                  <View style={s.vipIconBox}><Headphones size={18} color={theme.colors.premium} /></View>
                  <Text style={s.vipCardTitle}>VIP Telegram Chat</Text>
                </View>
                <Text style={s.vipCardDesc}>Join our private VIP Telegram group for direct developer access.</Text>
                <TouchableOpacity
                  style={s.vipActionBtn}
                  onPress={() => Linking.openURL('https://t.me/sleeparchitectvip')}
                  activeOpacity={0.85}
                >
                  <Text style={s.vipActionText}>Join VIP Group</Text>
                </TouchableOpacity>
              </View>

              {/* Response times */}
              <View style={s.vipCard}>
                <Text style={s.vipCardTitle}>Response Times</Text>
                {[
                  { label: 'VIP Priority Email', value: '< 2 hours', good: true },
                  { label: 'VIP Telegram', value: '< 1 hour', good: true },
                  { label: 'Standard Email', value: '24-48 hours', good: false },
                ].map((row, i) => (
                  <View key={i} style={[s.responseRow, i < 2 && s.responseRowDivider]}>
                    <Text style={s.responseLabel}>{row.label}</Text>
                    <Text style={[s.responseValue, { color: row.good ? theme.colors.success : theme.colors.textTertiary }]}>
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )
        )}

        <View style={s.bottomPadding} />
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
    columnGap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 24,
    letterSpacing: -0.2,
    color: theme.colors.textPrimary,
  },

  tabContainer: {
    flexDirection: 'row',
    columnGap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  activeTab: {
    backgroundColor: theme.colors.selectedBackground,
    borderColor: theme.colors.accent,
  },
  tabText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.accent,
  },
  vipTab: {
    borderColor: theme.colors.premiumBadgeBorder,
    backgroundColor: theme.colors.premiumBadgeBackground,
  },
  vipTabActive: {
    borderColor: theme.colors.premium,
  },
  vipTabText: {
    color: theme.colors.premium,
  },

  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  sectionDescription: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.textTertiary,
    marginBottom: 10,
  },

  // Search
  searchWrap: {
    position: 'relative',
    marginBottom: 20,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  searchInput: {
    height: 50,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
    color: theme.colors.textPrimary,
    paddingLeft: 44,
    paddingRight: 16,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 16,
  },

  // FAQ accordion card
  faqCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  faqRow: {
    paddingVertical: 14,
  },
  faqRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  faqAnswer: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: 10,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Still stuck grid
  stuckLabel: {
    marginTop: 4,
  },
  stuckGrid: {
    flexDirection: 'row',
    columnGap: 10,
    marginBottom: 16,
  },
  stuckTile: {
    flex: 1,
    height: 84,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 6,
  },
  stuckTileText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 12,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  footerHint: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
  },

  // Contact form
  formCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    padding: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: 12,
    padding: 12,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    borderRadius: 16,
    marginTop: 6,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: theme.colors.ctaBackground,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 16,
    color: theme.colors.ctaText,
  },

  // Other ways to reach us
  methodsCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    paddingHorizontal: 16,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    paddingVertical: 14,
  },
  methodRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodTextBlock: {
    rowGap: 2,
  },
  methodTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  methodValue: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.highlight,
  },

  bottomPadding: { height: 40 },

  // VIP screen
  vipHero: {
    borderRadius: theme.borderRadius.card,
    padding: 24,
    alignItems: 'center',
    rowGap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.premiumBadgeBorder,
    backgroundColor: theme.colors.premiumBadgeBackground,
  },
  vipHeroTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 20,
    color: theme.colors.premium,
  },
  vipHeroSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  vipCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.premiumBadgeBorder,
  },
  vipCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    marginBottom: 8,
  },
  vipIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.premiumBadgeBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vipCardTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  vipCardDesc: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  vipActionBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.premium,
  },
  vipActionText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.background,
  },
  responseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  responseRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  responseLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  responseValue: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 13,
  },
});
