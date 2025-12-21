import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { X, Cloud, RefreshCw, Save, LucideIcon } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useAppTheme';

const BenefitItem = ({ icon: Icon, text, theme }: { icon: LucideIcon; text: string; theme: any }) => (
  <View style={styles(theme).benefitItem}>
    <View style={styles(theme).benefitIconWrap}>
      <Icon size={18} color={theme.colors.accent} />
    </View>
    <Text style={styles(theme).benefitText}>{text}</Text>
  </View>
);

const GuestModeWarning: React.FC = () => {
  const { theme, isDark } = useAppTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [showModal, setShowModal] = useState(false);

  const isAuthenticated = Boolean(
    user?.id && user.id !== 'guest' && !user.id.startsWith?.('anonymous')
  );

  useEffect(() => {
    // Show modal once when component mounts for guest/unauthenticated users
    if (!isAuthenticated) {
      setShowModal(true);
    }
    // We intentionally only run on mount (eslint-disable-line react-hooks/exhaustive-deps)
  }, []);

  if (isAuthenticated) return null;

  const handleCreateAccount = () => {
    setShowModal(false);
    navigation.navigate('Signup' as never);
  };

  const handleContinueAsGuest = () => {
    setShowModal(false);
  };

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="fade"
      onRequestClose={handleContinueAsGuest}
    >
      <View style={styles(theme).backdrop}>
        <View style={styles(theme).cardWrapper}>
          <View style={styles(theme).header}>
            <Text style={styles(theme).headerTitle}>You're in Guest Mode</Text>
            <TouchableOpacity
              onPress={handleContinueAsGuest}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles(theme).body}
            contentContainerStyle={{ paddingBottom: 6 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles(theme).description}>
              You're currently using the app without an account. Create a free
              account to unlock cloud save, device sync and reliable backups.
            </Text>

            <View style={styles(theme).benefitsList}>
              <BenefitItem icon={Cloud} text="Cloud save: Back up your sleep data" theme={theme} />
              <BenefitItem icon={RefreshCw} text="Sync across devices automatically" theme={theme} />
              <BenefitItem icon={Save} text="Data backup & recovery" theme={theme} />
            </View>
          </ScrollView>

          <View style={styles(theme).actions}>
            <TouchableOpacity
              style={styles(theme).primaryButton}
              onPress={handleCreateAccount}
              activeOpacity={0.85}
            >
              <Text style={styles(theme).primaryText}>Create Free Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles(theme).ghostButton}
              onPress={handleContinueAsGuest}
              activeOpacity={0.8}
            >
              <Text style={styles(theme).ghostText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = (theme: any) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    // shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  body: {
    maxHeight: 240,
    marginBottom: 20,
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  benefitsList: {
    marginTop: 4,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'column',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  ghostButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  ghostText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default GuestModeWarning;
