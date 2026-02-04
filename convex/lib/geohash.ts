/**
 * Geohash encoding/decoding utilities
 *
 * Geohash is a hierarchical spatial data structure which subdivides space into
 * buckets of grid shape. It's useful for proximity searches and location-based
 * queries.
 */

// Base32 character set used for geohash encoding
const BASE32_CHARS = "0123456789bcdefghjkmnpqrstuvwxyz";

// Lookup table for decoding
const BASE32_DECODE: Record<string, number> = {};
for (let i = 0; i < BASE32_CHARS.length; i++) {
  BASE32_DECODE[BASE32_CHARS[i]] = i;
}

// Bit patterns for each character position
const BITS = [16, 8, 4, 2, 1];

/**
 * Encode latitude/longitude to a geohash string
 *
 * @param lat - Latitude (-90 to 90)
 * @param lng - Longitude (-180 to 180)
 * @param precision - Number of characters in the geohash (default: 9)
 * @returns Geohash string
 */
export function encode(lat: number, lng: number, precision = 9): string {
  if (lat < -90 || lat > 90) {
    throw new Error("Latitude must be between -90 and 90");
  }
  if (lng < -180 || lng > 180) {
    throw new Error("Longitude must be between -180 and 180");
  }

  let latMin = -90.0;
  let latMax = 90.0;
  let lngMin = -180.0;
  let lngMax = 180.0;

  let hash = "";
  let bit = 0;
  let ch = 0;
  let isEven = true;

  while (hash.length < precision) {
    if (isEven) {
      // Bisect longitude
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        ch |= BITS[bit];
        lngMin = mid;
      } else {
        lngMax = mid;
      }
    } else {
      // Bisect latitude
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch |= BITS[bit];
        latMin = mid;
      } else {
        latMax = mid;
      }
    }

    isEven = !isEven;
    bit++;

    if (bit === 5) {
      hash += BASE32_CHARS[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

/**
 * Decode a geohash string to latitude/longitude
 *
 * @param geohash - Geohash string to decode
 * @returns Object with lat, lng, and error margins
 */
export function decode(geohash: string): {
  lat: number;
  lng: number;
  latError: number;
  lngError: number;
} {
  if (!geohash || geohash.length === 0) {
    throw new Error("Geohash cannot be empty");
  }

  let latMin = -90.0;
  let latMax = 90.0;
  let lngMin = -180.0;
  let lngMax = 180.0;

  let isEven = true;

  for (const char of geohash.toLowerCase()) {
    const charIndex = BASE32_DECODE[char];
    if (charIndex === undefined) {
      throw new Error(`Invalid character in geohash: ${char}`);
    }

    for (let i = 0; i < 5; i++) {
      const bitValue = (charIndex >> (4 - i)) & 1;

      if (isEven) {
        // Longitude
        const mid = (lngMin + lngMax) / 2;
        if (bitValue === 1) {
          lngMin = mid;
        } else {
          lngMax = mid;
        }
      } else {
        // Latitude
        const mid = (latMin + latMax) / 2;
        if (bitValue === 1) {
          latMin = mid;
        } else {
          latMax = mid;
        }
      }

      isEven = !isEven;
    }
  }

  return {
    lat: (latMin + latMax) / 2,
    lng: (lngMin + lngMax) / 2,
    latError: (latMax - latMin) / 2,
    lngError: (lngMax - lngMin) / 2,
  };
}

/**
 * Get bounding box for a geohash
 *
 * @param geohash - Geohash string
 * @returns Bounding box with min/max lat/lng
 */
export function getBounds(geohash: string): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  if (!geohash || geohash.length === 0) {
    throw new Error("Geohash cannot be empty");
  }

  let latMin = -90.0;
  let latMax = 90.0;
  let lngMin = -180.0;
  let lngMax = 180.0;

  let isEven = true;

  for (const char of geohash.toLowerCase()) {
    const charIndex = BASE32_DECODE[char];
    if (charIndex === undefined) {
      throw new Error(`Invalid character in geohash: ${char}`);
    }

    for (let i = 0; i < 5; i++) {
      const bitValue = (charIndex >> (4 - i)) & 1;

      if (isEven) {
        const mid = (lngMin + lngMax) / 2;
        if (bitValue === 1) {
          lngMin = mid;
        } else {
          lngMax = mid;
        }
      } else {
        const mid = (latMin + latMax) / 2;
        if (bitValue === 1) {
          latMin = mid;
        } else {
          latMax = mid;
        }
      }

      isEven = !isEven;
    }
  }

  return {
    minLat: latMin,
    maxLat: latMax,
    minLng: lngMin,
    maxLng: lngMax,
  };
}

/**
 * Get neighboring geohashes (8 directions)
 *
 * @param geohash - Center geohash
 * @returns Object with neighboring geohashes
 */
export function getNeighbors(geohash: string): {
  n: string;
  ne: string;
  e: string;
  se: string;
  s: string;
  sw: string;
  w: string;
  nw: string;
} {
  const { lat, lng, latError, lngError } = decode(geohash);
  const precision = geohash.length;

  // Calculate step sizes
  const latStep = latError * 2;
  const lngStep = lngError * 2;

  return {
    n: encode(lat + latStep, lng, precision),
    ne: encode(lat + latStep, lng + lngStep, precision),
    e: encode(lat, lng + lngStep, precision),
    se: encode(lat - latStep, lng + lngStep, precision),
    s: encode(lat - latStep, lng, precision),
    sw: encode(lat - latStep, lng - lngStep, precision),
    w: encode(lat, lng - lngStep, precision),
    nw: encode(lat + latStep, lng - lngStep, precision),
  };
}

/**
 * Calculate approximate distance in kilometers between two points
 * using the Haversine formula
 *
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const EARTH_RADIUS_KM = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get precision level based on desired accuracy in kilometers
 *
 * Approximate cell dimensions for each precision level:
 * 1: ~5000 km
 * 2: ~1250 km
 * 3: ~156 km
 * 4: ~39 km
 * 5: ~4.9 km
 * 6: ~1.2 km
 * 7: ~153 m
 * 8: ~38 m
 * 9: ~4.8 m
 *
 * @param accuracyKm - Desired accuracy in kilometers
 * @returns Recommended precision level
 */
export function getPrecisionForAccuracy(accuracyKm: number): number {
  if (accuracyKm >= 5000) return 1;
  if (accuracyKm >= 1250) return 2;
  if (accuracyKm >= 156) return 3;
  if (accuracyKm >= 39) return 4;
  if (accuracyKm >= 4.9) return 5;
  if (accuracyKm >= 1.2) return 6;
  if (accuracyKm >= 0.153) return 7;
  if (accuracyKm >= 0.038) return 8;
  return 9;
}

/**
 * Check if a geohash contains another geohash (is a prefix)
 *
 * @param parent - Parent geohash
 * @param child - Child geohash
 * @returns True if parent contains child
 */
export function contains(parent: string, child: string): boolean {
  return child.toLowerCase().startsWith(parent.toLowerCase());
}

/**
 * Get all geohashes within a bounding box at a given precision
 *
 * @param bounds - Bounding box
 * @param precision - Geohash precision
 * @returns Array of geohashes covering the bounding box
 */
export function getGeohashesInBounds(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  precision: number
): Array<string> {
  const geohashes = new Set<string>();

  // Get step size for this precision
  const sampleHash = encode(bounds.minLat, bounds.minLng, precision);
  const { latError, lngError } = decode(sampleHash);
  const latStep = latError * 2;
  const lngStep = lngError * 2;

  // Iterate through the bounding box
  for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += latStep) {
    for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += lngStep) {
      geohashes.add(encode(lat, lng, precision));
    }
  }

  return Array.from(geohashes);
}
