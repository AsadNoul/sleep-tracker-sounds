import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Info } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../hooks/useAppTheme';
import { supabase } from '../lib/supabase';
import EmptyState from '../components/EmptyState';

// Real manual-entry temperature/humidity/light/noise logging, matching
// the canvas's Hl-Room.dc.html design. Readings are typed in by the user
// (a thermometer/smart-home app for temp/humidity) or picked from a short
// list (light/noise) — this is NOT a sensor integration, same approach the
// canvas itself describes ("Enter readings from a thermometer...").
// Backed by the new `room_environment_readings` table (see
// supabase_tables.sql) — the user runs that SQL once in their own
// Supabase project; this screen is written against that schema.

interface RoomReading {
  id: string;
  temperature_celsius: number | null;
  humidity_percent: number | null;
  light_level: 'dark' | 'dim' | 'bright' | null;
  noise_db: number | null;
  recorded_at: string;
}

const LIGHT_LEVELS: Array<{ value: 'dark' | 'dim' | 'bright'; label: string }> = [
  { value: 'dark', label: 'Dark' },
  { value: 'dim', label: 'Dim' },
  { value: 'bright', label: 'Bright' },
];

function tempStatus(c: number | null): { label: string; ok: boolean } {
  if (c === null) return { label: '—', ok: false };
  if (c >= 16 && c <= 20) return { label: 'Ideal 16–20°C', ok: true };
  if (c < 16) return { label: 'A bit cold', ok: false };
  return { label: 'A bit warm', ok: false };
}

function humidityStatus(h: number | null): { label: string; ok: boolean } {
  if (h === null) return { label: '—', ok: false };
  if (h >= 30 && h <= 50) return { label: 'Ideal', ok: true };
  return h > 50 ? { label: 'A bit humid', ok: false } : { label: 'A bit dry', ok: false };
}

function lightStatus(l: RoomReading['light_level']): { label: string; ok: boolean } {
  if (!l) return { label: '—', ok: false };
  return l === 'dark' ? { label: 'Ideal', ok: true } : { label: 'Could be darker', ok: false };
}

function noiseStatus(db: number | null): { label: string; ok: boolean } {
  if (db === null) return { label: '—', ok: false };
  if (db <= 40) return { label: 'Quiet', ok: true };
  return { label: 'A bit loud', ok: false };
}

export default function RoomEnvironmentScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const s = useMemo(() => styles(theme), [theme]);

  const [latest, setLatest] = useState<RoomReading | null>(null);
  const [history, setHistory] = useState<RoomReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [formTemp, setFormTemp] = useState('');
  const [formHumidity, setFormHumidity] = useState('');
  const [formLight, setFormLight] = useState<'dark' | 'dim' | 'bright'>('dark');
  const [formNoise, setFormNoise] = useState('');

  useEffect(() => {
    fetchReadings();
  }, [user]);

  const fetchReadings = async () => {
    if (!user || user.id === 'guest') {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('room_environment_readings')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(14);
      if (error) throw error;
      setHistory(data || []);
      setLatest(data && data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Failed to load room readings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openForm = () => {
    setFormTemp(latest?.temperature_celsius != null ? String(latest.temperature_celsius) : '');
    setFormHumidity(latest?.humidity_percent != null ? String(latest.humidity_percent) : '');
    setFormLight(latest?.light_level || 'dark');
    setFormNoise(latest?.noise_db != null ? String(latest.noise_db) : '');
    setShowModal(true);
  };

  const saveReading = async () => {
    if (!user || user.id === 'guest') {
      Alert.alert('Log in required', 'Sign in to save your room readings.');
      return;
    }
    const temp = formTemp.trim() ? parseFloat(formTemp) : null;
    const humidity = formHumidity.trim() ? parseFloat(formHumidity) : null;
    const noise = formNoise.trim() ? parseFloat(formNoise) : null;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('room_environment_readings').insert({
        user_id: user.id,
        temperature_celsius: temp,
        humidity_percent: humidity,
        light_level: formLight,
        noise_db: noise,
        recorded_at: new Date().toISOString(),
      });
      if (error) throw error;
      setShowModal(false);
      fetchReadings();
    } catch (error) {
      console.error('Failed to save room reading:', error);
      Alert.alert('Error', 'Could not save your reading. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const tiles = [
    { name: 'Temperature', value: latest?.temperature_celsius != null ? `${latest.temperature_celsius}°C` : '—', ...tempStatus(latest?.temperature_celsius ?? null) },
    { name: 'Humidity', value: latest?.humidity_percent != null ? `${latest.humidity_percent}%` : '—', ...humidityStatus(latest?.humidity_percent ?? null) },
    { name: 'Light', value: latest?.light_level ? latest.light_level[0].toUpperCase() + latest.light_level.slice(1) : '—', ...lightStatus(latest?.light_level ?? null) },
    { name: 'Noise', value: latest?.noise_db != null ? `${latest.noise_db} dB` : '—', ...noiseStatus(latest?.noise_db ?? null) },
  ];

  const loggedAtLabel = latest
    ? `Logged ${new Date(latest.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${new Date(latest.recorded_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    : 'No readings yet';

  if (isLoading) {
    return (
      <View style={[s.container, s.centered]}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <ChevronLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerTextBlock}>
          <Text style={s.headerTitle}>Your bedroom</Text>
          <Text style={s.headerSubtitle}>{loggedAtLabel}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {!latest ? (
          <EmptyState
            title="No readings logged yet"
            description="Log your bedroom's temperature, humidity, light and noise to see how they affect your sleep score."
            actionLabel="Log first reading"
            onAction={openForm}
          />
        ) : (
          <>
            <View style={s.tileGrid}>
              {tiles.map((t) => (
                <View key={t.name} style={s.tile}>
                  <Text style={s.tileLabel}>{t.name}</Text>
                  <Text style={s.tileValue}>{t.value}</Text>
                  <View style={[s.tileStatus, t.ok ? s.tileStatusOk : s.tileStatusWarn]}>
                    <Text style={[s.tileStatusText, t.ok ? s.tileStatusTextOk : s.tileStatusTextWarn]}>
                      {t.label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {history.length >= 2 && (
              <View style={s.chartCard}>
                <View style={s.chartHeader}>
                  <Text style={s.chartTitle}>Recent readings</Text>
                  <Text style={s.chartSubtitle}>Last {history.length} nights</Text>
                </View>
                {history.slice(0, 5).map((r) => (
                  <View key={r.id} style={s.chartRow}>
                    <Text style={s.chartRowDate}>
                      {new Date(r.recorded_at).toLocaleDateString(undefined, { weekday: 'short' })}
                    </Text>
                    <Text style={s.chartRowValue}>
                      {r.temperature_celsius != null ? `${r.temperature_celsius}°C` : '—'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={s.infoRow}>
          <Info size={16} color={theme.colors.textTertiary} />
          <Text style={s.infoText}>
            Enter readings from a thermometer or smart home app. Noise level comes from your phone's microphone, if available.
          </Text>
        </View>

        {latest && (
          <TouchableOpacity style={s.updateButton} onPress={openForm} activeOpacity={0.85}>
            <Text style={s.updateButtonText}>Update readings</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Log your bedroom</Text>

            <Text style={s.fieldLabel}>Temperature (°C)</Text>
            <TextInput
              style={s.input}
              value={formTemp}
              onChangeText={setFormTemp}
              keyboardType="decimal-pad"
              placeholder="e.g. 19"
              placeholderTextColor={theme.colors.textTertiary}
            />

            <Text style={s.fieldLabel}>Humidity (%)</Text>
            <TextInput
              style={s.input}
              value={formHumidity}
              onChangeText={setFormHumidity}
              keyboardType="decimal-pad"
              placeholder="e.g. 45"
              placeholderTextColor={theme.colors.textTertiary}
            />

            <Text style={s.fieldLabel}>Light</Text>
            <View style={s.pillRow}>
              {LIGHT_LEVELS.map((l) => (
                <TouchableOpacity
                  key={l.value}
                  style={[s.pill, formLight === l.value && s.pillSelected]}
                  onPress={() => setFormLight(l.value)}
                >
                  <Text style={[s.pillText, formLight === l.value && s.pillTextSelected]}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Noise (dB)</Text>
            <TextInput
              style={s.input}
              value={formNoise}
              onChangeText={setFormNoise}
              keyboardType="decimal-pad"
              placeholder="e.g. 32"
              placeholderTextColor={theme.colors.textTertiary}
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowModal(false)} disabled={isSaving}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={saveReading} disabled={isSaving} activeOpacity={0.85}>
                {isSaving ? (
                  <ActivityIndicator color={theme.colors.ctaText} />
                ) : (
                  <Text style={s.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 12,
      paddingTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 8,
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
    headerTextBlock: {
      flex: 1,
    },
    headerTitle: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 24,
      color: theme.colors.textPrimary,
    },
    headerSubtitle: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
      rowGap: 16,
    },
    tileGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: 12,
      rowGap: 12,
    },
    tile: {
      width: '47%',
      minHeight: 132,
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
      padding: 16,
      justifyContent: 'space-between',
      rowGap: 8,
    },
    tileLabel: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    tileValue: {
      fontFamily: theme.typography.fontFamily.display,
      fontSize: 34,
      color: theme.colors.textPrimary,
    },
    tileStatus: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 99,
      borderWidth: 1,
    },
    tileStatusOk: {
      backgroundColor: theme.colors.navActiveBackground,
      borderColor: theme.colors.cardBorder,
    },
    tileStatusWarn: {
      backgroundColor: theme.colors.premiumBadgeBackground,
      borderColor: theme.colors.premiumBadgeBorder,
    },
    tileStatusText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 13,
    },
    tileStatusTextOk: {
      color: theme.colors.textPrimary,
    },
    tileStatusTextWarn: {
      color: theme.colors.premiumBadgeText,
    },
    chartCard: {
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
      padding: 16,
      rowGap: 10,
    },
    chartHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    chartTitle: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    chartSubtitle: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    chartRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    chartRowDate: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    chartRowValue: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      columnGap: 10,
    },
    infoText: {
      flex: 1,
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.textTertiary,
    },
    updateButton: {
      height: 60,
      borderRadius: 20,
      backgroundColor: theme.colors.ctaBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    updateButtonText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 17,
      color: theme.colors.ctaText,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.cardOverlay,
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      padding: 24,
      rowGap: 12,
    },
    modalTitle: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 22,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    fieldLabel: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    input: {
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
      paddingHorizontal: 14,
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    pillRow: {
      flexDirection: 'row',
      columnGap: 8,
    },
    pill: {
      flex: 1,
      height: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillSelected: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    pillText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    pillTextSelected: {
      color: theme.colors.background,
    },
    modalActions: {
      flexDirection: 'row',
      columnGap: 12,
      marginTop: 8,
    },
    modalCancel: {
      flex: 1,
      height: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    modalSave: {
      flex: 1,
      height: 52,
      borderRadius: 16,
      backgroundColor: theme.colors.ctaBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalSaveText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 15,
      color: theme.colors.ctaText,
    },
  });
