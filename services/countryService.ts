/**
 * Country Detection Service
 * Provides fallback country detection based on device locale
 * For production, integrate with IP geolocation API
 */

import * as Localization from 'expo-localization';
import logger from '../utils/logger';

class CountryService {
  /**
   * Get user's country from device locale
   * Returns country code (e.g., 'US', 'GB', 'IN')
   */
  getCountryFromLocale(): string | null {
    try {
      // Get device locale (e.g., 'en-US', 'en-GB', 'hi-IN')
      const locale = Localization.locale;
      
      if (locale && locale.includes('-')) {
        // Extract country code from locale (e.g., 'US' from 'en-US')
        const countryCode = locale.split('-')[1];
        return countryCode?.toUpperCase() || null;
      }
      
      // Try region code as fallback
      const region = Localization.region;
      return region?.toUpperCase() || null;
    } catch (error) {
      logger.error('Error getting country from locale:', error);
      return null;
    }
  }

  /**
   * Get country name from country code
   */
  getCountryName(countryCode: string): string {
    const countryNames: { [key: string]: string } = {
      'US': 'United States',
      'GB': 'United Kingdom',
      'CA': 'Canada',
      'AU': 'Australia',
      'IN': 'India',
      'DE': 'Germany',
      'FR': 'France',
      'ES': 'Spain',
      'IT': 'Italy',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'JP': 'Japan',
      'KR': 'South Korea',
      'CN': 'China',
      'RU': 'Russia',
      'ZA': 'South Africa',
      'NL': 'Netherlands',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland',
      'PL': 'Poland',
      'TR': 'Turkey',
      'SA': 'Saudi Arabia',
      'AE': 'UAE',
      'SG': 'Singapore',
      'MY': 'Malaysia',
      'TH': 'Thailand',
      'PH': 'Philippines',
      'ID': 'Indonesia',
      'VN': 'Vietnam',
      'NZ': 'New Zealand',
      'AR': 'Argentina',
      'CL': 'Chile',
      'CO': 'Colombia',
      'PE': 'Peru',
      'EG': 'Egypt',
      'NG': 'Nigeria',
      'KE': 'Kenya',
      'PK': 'Pakistan',
      'BD': 'Bangladesh',
    };

    return countryNames[countryCode.toUpperCase()] || countryCode;
  }

  /**
   * Get country emoji flag from country code
   */
  getCountryFlag(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    
    return String.fromCodePoint(...codePoints);
  }

  /**
   * Get user's country information
   */
  async getUserCountryInfo(): Promise<{
    countryCode: string | null;
    countryName: string | null;
    flag: string;
  }> {
    try {
      const countryCode = this.getCountryFromLocale();
      
      if (!countryCode) {
        return {
          countryCode: null,
          countryName: null,
          flag: '🌍',
        };
      }

      return {
        countryCode,
        countryName: this.getCountryName(countryCode),
        flag: this.getCountryFlag(countryCode),
      };
    } catch (error) {
      logger.error('Error getting country info:', error);
      return {
        countryCode: null,
        countryName: null,
        flag: '🌍',
      };
    }
  }
}

export default new CountryService();
