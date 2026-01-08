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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const theme = {
  background: '#0F111A',
  card: '#1B1D2A',
  accent: '#00FFD1',
  highlight: '#33C6FF',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0AEC0',
};

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
  const navigation = useNavigation();
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success
      Alert.alert(
        'Message Sent',
        'Thank you for contacting us. We will get back to you as soon as possible.',
        [{ text: 'OK', onPress: () => {
          setName('');
          setEmail('');
          setMessage('');
          setSubject('');
        }}]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again later.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[theme.background, '#0A0C14']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>
      
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'faq' && styles.activeTab]}
          onPress={() => setActiveTab('faq')}
        >
          <Ionicons 
            name="help-circle" 
            size={20} 
            color={activeTab === 'faq' ? theme.accent : theme.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'faq' && styles.activeTabText
          ]}>
            FAQ
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'contact' && styles.activeTab]}
          onPress={() => setActiveTab('contact')}
        >
          <Ionicons 
            name="mail" 
            size={20} 
            color={activeTab === 'contact' ? theme.accent : theme.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'contact' && styles.activeTabText
          ]}>
            Contact Us
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'faq' ? (
          <View style={styles.faqContainer}>
            <Text style={styles.sectionDescription}>
              Find answers to commonly asked questions about our app and services.
            </Text>
            
            {faqs.map((faq) => (
              <TouchableOpacity
                key={faq.id}
                style={[
                  styles.faqItem,
                  expandedFaq === faq.id && styles.expandedFaqItem
                ]}
                onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                activeOpacity={0.8}
              >
                <BlurView intensity={20} style={styles.faqBlur}>
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQuestion}>{faq.question}</Text>
                    <Ionicons
                      name={expandedFaq === faq.id ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </View>

                  {expandedFaq === faq.id && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </BlurView>
              </TouchableOpacity>
            ))}
            
            <View style={styles.moreHelpSection}>
              <Text style={styles.moreHelpTitle}>Need More Help?</Text>
              <Text style={styles.moreHelpText}>
                If you couldn't find the answer to your question, please contact our support team.
              </Text>
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => setActiveTab('contact')}
              >
                <LinearGradient
                  colors={[theme.accent, theme.highlight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.contactButtonGradient}
                >
                  <Text style={styles.contactButtonText}>Contact Support</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.contactContainer}>
            <Text style={styles.sectionDescription}>
              Have a question or need assistance? Fill out the form below and our support team will get back to you as soon as possible.
            </Text>
            
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={theme.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your.email@example.com"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subject</Text>
                <TextInput
                  style={styles.input}
                  placeholder="What is this regarding?"
                  placeholderTextColor={theme.textSecondary}
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Message</Text>
                <TextInput
                  style={[styles.input, styles.messageInput]}
                  placeholder="Please describe your issue or question in detail"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  value={message}
                  onChangeText={setMessage}
                />
              </View>
              
              <TouchableOpacity 
                style={[styles.submitButton, isSending && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={isSending}
              >
                <LinearGradient
                  colors={[theme.accent, theme.highlight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  {isSending ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Send Message</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            <View style={styles.alternativeContactSection}>
              <Text style={styles.alternativeContactTitle}>Other Ways to Reach Us</Text>
              
              <View style={styles.contactMethodsContainer}>
                <View style={styles.contactMethod}>
                  <View style={styles.contactMethodIcon}>
                    <Ionicons name="mail" size={24} color={theme.accent} />
                  </View>
                  <View>
                    <Text style={styles.contactMethodTitle}>Email</Text>
                    <Text style={styles.contactMethodValue}>support@sleepapp.com</Text>
                  </View>
                </View>
                
                <View style={styles.contactMethod}>
                  <View style={styles.contactMethodIcon}>
                    <Ionicons name="time" size={24} color={theme.accent} />
                  </View>
                  <View>
                    <Text style={styles.contactMethodTitle}>Response Time</Text>
                    <Text style={styles.contactMethodValue}>Within 24 hours</Text>
                  </View>
                </View>
                
                <View style={styles.contactMethod}>
                  <View style={styles.contactMethodIcon}>
                    <Ionicons name="logo-twitter" size={24} color={theme.accent} />
                  </View>
                  <View>
                    <Text style={styles.contactMethodTitle}>Twitter</Text>
                    <Text style={styles.contactMethodValue}>@sleepapp</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
        
        {/* Bottom padding for tab bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
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
    color: theme.textPrimary,
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
    borderColor: theme.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
    marginLeft: 6,
  },
  activeTabText: {
    color: theme.accent,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.textSecondary,
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
    borderColor: theme.accent,
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
    color: theme.textPrimary,
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
    color: theme.textSecondary,
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
    color: theme.textPrimary,
    marginBottom: 8,
  },
  moreHelpText: {
    fontSize: 14,
    color: theme.textSecondary,
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
    color: theme.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(15, 17, 26, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(51, 198, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: theme.textPrimary,
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
    color: theme.textPrimary,
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
    color: theme.textPrimary,
    marginBottom: 4,
  },
  contactMethodValue: {
    fontSize: 14,
    color: theme.highlight,
  },
  bottomPadding: {
    height: 100,
  },
});