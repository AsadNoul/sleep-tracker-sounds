import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
export const STORAGE_KEYS = {
  PROFILE: '@sleep_app_profile',
  SETTINGS: '@sleep_app_settings',
  PRIVACY_SETTINGS: '@sleep_app_privacy',
  USER_AGE: '@sleep_app_user_age',
};

// Profile storage
export const saveProfile = async (profile: { name: string; email: string }) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    return true;
  } catch (error) {
    console.error('Error saving profile:', error);
    return false;
  }
};

export const loadProfile = async () => {
  try {
    const profile = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
    return profile ? JSON.parse(profile) : null;
  } catch (error) {
    console.error('Error loading profile:', error);
    return null;
  }
};

// Settings storage
export const saveSettings = async (settings: any) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

export const loadSettings = async () => {
  try {
    const settings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    return settings ? JSON.parse(settings) : null;
  } catch (error) {
    console.error('Error loading settings:', error);
    return null;
  }
};

// Privacy settings storage
export const savePrivacySettings = async (settings: any) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PRIVACY_SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving privacy settings:', error);
    return false;
  }
};

export const loadPrivacySettings = async () => {
  try {
    const settings = await AsyncStorage.getItem(STORAGE_KEYS.PRIVACY_SETTINGS);
    return settings ? JSON.parse(settings) : null;
  } catch (error) {
    console.error('Error loading privacy settings:', error);
    return null;
  }
};

// User age storage
export const saveUserAge = async (age: number) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_AGE, age.toString());
    return true;
  } catch (error) {
    console.error('Error saving user age:', error);
    return false;
  }
};

export const loadUserAge = async (): Promise<number | null> => {
  try {
    const age = await AsyncStorage.getItem(STORAGE_KEYS.USER_AGE);
    return age ? parseInt(age, 10) : null;
  } catch (error) {
    console.error('Error loading user age:', error);
    return null;
  }
};
