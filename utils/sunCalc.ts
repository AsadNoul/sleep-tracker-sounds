// ============================================================================
// sunCalc.ts — sunrise/sunset calculation
// ============================================================================
// Pure JS/TS port of the core sunrise/sunset equations from NOAA's public
// Solar Calculator (https://gml.noaa.gov/grad/solcalc/), which is itself
// based on Jean Meeus' "Astronomical Algorithms". The NOAA formulas are
// public domain (US government work) and are the same reference algorithm
// used by the long-standing `suncalc` npm package and countless other
// implementations — chosen here over pulling in a dependency because:
//   1. It's ~80 lines of pure math with zero native/runtime deps, so it
//      can't ever conflict with Expo Go's bundled native modules.
//   2. Vendoring it directly means no supply-chain surface added for a
//      single, well-known, rarely-changing calculation.
//   3. Precision is more than sufficient for a "which theme should the UI
//      be in" decision — sub-minute accuracy, not navigation-grade.
//
// All angles are handled in degrees at the API boundary and radians
// internally, matching the NOAA spreadsheet's convention.
// ============================================================================

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Julian day number for a given UTC Date (NOAA calc, column "Julian Day"). */
function toJulianDay(date: Date): number {
  const time = date.getTime();
  return time / 86400000 + 2440587.5;
}

/** Julian century since J2000.0, used throughout the NOAA solar position formulas. */
function julianCentury(jd: number): number {
  return (jd - 2451545) / 36525;
}

/** Geometric mean longitude of the sun (degrees). */
function geomMeanLongSun(t: number): number {
  let l0 = 280.46646 + t * (36000.76983 + t * 0.0003032);
  while (l0 > 360) l0 -= 360;
  while (l0 < 0) l0 += 360;
  return l0;
}

/** Geometric mean anomaly of the sun (degrees). */
function geomMeanAnomalySun(t: number): number {
  return 357.52911 + t * (35999.05029 - 0.0001537 * t);
}

/** Eccentricity of Earth's orbit (unitless). */
function eccentricityEarthOrbit(t: number): number {
  return 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
}

/** Equation of the center for the sun (degrees). */
function sunEqOfCenter(t: number): number {
  const m = geomMeanAnomalySun(t);
  const mrad = toRad(m);
  const sinm = Math.sin(mrad);
  const sin2m = Math.sin(mrad * 2);
  const sin3m = Math.sin(mrad * 3);
  return (
    sinm * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    sin2m * (0.019993 - 0.000101 * t) +
    sin3m * 0.000289
  );
}

/** True longitude of the sun (degrees). */
function sunTrueLong(t: number): number {
  return geomMeanLongSun(t) + sunEqOfCenter(t);
}

/** Apparent longitude of the sun (degrees), corrected for nutation/aberration. */
function sunApparentLong(t: number): number {
  const o = sunTrueLong(t);
  const omega = 125.04 - 1934.136 * t;
  return o - 0.00569 - 0.00478 * Math.sin(toRad(omega));
}

/** Mean obliquity of the ecliptic (degrees). */
function meanObliquityOfEcliptic(t: number): number {
  const seconds = 21.448 - t * (46.815 + t * (0.00059 - t * 0.001813));
  return 23 + (26 + seconds / 60) / 60;
}

/** Corrected obliquity of the ecliptic (degrees), corrected for nutation. */
function obliquityCorrected(t: number): number {
  const e0 = meanObliquityOfEcliptic(t);
  const omega = 125.04 - 1934.136 * t;
  return e0 + 0.00256 * Math.cos(toRad(omega));
}

/** Declination of the sun (degrees). */
function sunDeclination(t: number): number {
  const e = obliquityCorrected(t);
  const lambda = sunApparentLong(t);
  const sint = Math.sin(toRad(e)) * Math.sin(toRad(lambda));
  return toDeg(Math.asin(sint));
}

/** "Equation of time" (minutes) — difference between apparent and mean solar time. */
function equationOfTime(t: number): number {
  const epsilon = toRad(obliquityCorrected(t));
  const l0 = toRad(geomMeanLongSun(t));
  const e = eccentricityEarthOrbit(t);
  const m = toRad(geomMeanAnomalySun(t));

  const y = Math.tan(epsilon / 2) * Math.tan(epsilon / 2);

  const sin2l0 = Math.sin(2 * l0);
  const sinm = Math.sin(m);
  const cos2l0 = Math.cos(2 * l0);
  const sin4l0 = Math.sin(4 * l0);
  const sin2m = Math.sin(2 * m);

  const etime =
    y * sin2l0 -
    2 * e * sinm +
    4 * e * y * sinm * cos2l0 -
    0.5 * y * y * sin4l0 -
    1.25 * e * e * sin2m;

  return toDeg(etime) * 4; // minutes
}

/**
 * Hour-angle (degrees) of sunrise/sunset for a given latitude and solar
 * declination, using the standard solar elevation angle of -0.833°
 * (accounts for atmospheric refraction + the sun's apparent radius).
 * Returns null if the sun never rises/sets at this latitude on this day
 * (polar day/night).
 */
function hourAngleSunrise(lat: number, solarDec: number): number | null {
  const latRad = toRad(lat);
  const decRad = toRad(solarDec);
  const zenith = toRad(90.833);

  const cosH =
    Math.cos(zenith) / (Math.cos(latRad) * Math.cos(decRad)) -
    Math.tan(latRad) * Math.tan(decRad);

  if (cosH > 1 || cosH < -1) return null; // no sunrise/sunset this day at this lat
  return toDeg(Math.acos(cosH));
}

export interface SunTimes {
  /** Sunrise time, in UTC, as a Date. Null if the sun doesn't rise (polar night/day). */
  sunrise: Date | null;
  /** Sunset time, in UTC, as a Date. Null if the sun doesn't set (polar night/day). */
  sunset: Date | null;
}

/**
 * Computes today's sunrise and sunset (in UTC) for a given latitude/longitude,
 * based on the calendar date of `date` (local to wherever `date` represents
 * noon-ish — pass a Date constructed from the device's local "today").
 *
 * @param lat latitude in degrees, -90..90 (positive = north)
 * @param lon longitude in degrees, -180..180 (positive = east)
 * @param date a Date whose UTC calendar date is used as the day to compute for
 */
export function getSunTimes(lat: number, lon: number, date: Date = new Date()): SunTimes {
  // Anchor on local-noon UTC for the given calendar day to get a stable
  // Julian day / century for the whole-day solar position calculation.
  const noonUtc = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
  );
  const jd = toJulianDay(noonUtc);
  const t = julianCentury(jd);

  const solarDec = sunDeclination(t);
  const eqTime = equationOfTime(t);
  const hourAngle = hourAngleSunrise(lat, solarDec);

  if (hourAngle === null) {
    return { sunrise: null, sunset: null };
  }

  // Minutes from UTC midnight, solved from the NOAA sunrise/sunset formula.
  const sunriseMinutesUtc = 720 - 4 * (lon + hourAngle) - eqTime;
  const sunsetMinutesUtc = 720 - 4 * (lon - hourAngle) - eqTime;

  const dayStartUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);

  return {
    sunrise: new Date(dayStartUtc + sunriseMinutesUtc * 60000),
    sunset: new Date(dayStartUtc + sunsetMinutesUtc * 60000),
  };
}
