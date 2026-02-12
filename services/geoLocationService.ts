import logger from '../utils/logger';

interface GeoLocation {
  country: string;
  country_code: string;
  city?: string;
  region?: string;
  ip: string;
}

class GeoLocationService {
  private cachedLocation: GeoLocation | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get user's country based on IP address using ipapi.co free API
   */
  async getUserLocation(): Promise<GeoLocation | null> {
    try {
      // Return cached result if still valid
      if (this.cachedLocation && Date.now() < this.cacheExpiry) {
        return this.cachedLocation;
      }

      // Use ipapi.co free tier (no API key needed, 1000 requests/day)
      const response = await fetch('https://ipapi.co/json/', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Check for error in response
      if (data.error) {
        logger.error('GeoLocation API error:', data);
        return null;
      }

      const location: GeoLocation = {
        country: data.country_name || 'Unknown',
        country_code: data.country_code || 'XX',
        city: data.city,
        region: data.region,
        ip: data.ip || 'Unknown',
      };

      // Cache the result
      this.cachedLocation = location;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      logger.debug('📍 User location detected:', location);
      return location;
    } catch (error) {
      logger.error('Failed to get user location:', error);
      return null;
    }
  }

  /**
   * Get just the country name
   */
  async getUserCountry(): Promise<string> {
    const location = await this.getUserLocation();
    return location?.country || 'Unknown';
  }

  /**
   * Get just the country code
   */
  async getUserCountryCode(): Promise<string> {
    const location = await this.getUserLocation();
    return location?.country_code || 'XX';
  }

  /**
   * Clear cached location
   */
  clearCache() {
    this.cachedLocation = null;
    this.cacheExpiry = 0;
  }
}

export default new GeoLocationService();
