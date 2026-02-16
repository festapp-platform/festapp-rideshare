import { describe, it, expect } from 'vitest';
import {
  getUserLevel,
  USER_LEVELS,
} from '../../constants/gamification';
import { CreateEventSchema } from '../event';
import {
  CreateRouteIntentSchema,
  ConfirmRouteIntentSchema,
} from '../flexible';

// ---------------------------------------------------------------------------
// getUserLevel tests
// ---------------------------------------------------------------------------
describe('getUserLevel', () => {
  it('returns "New" for 0 rides and 0 rating', () => {
    expect(getUserLevel(0, 0).name).toBe('New');
  });

  it('returns "New" for 2 rides and 4.5 rating (not enough rides for Regular)', () => {
    expect(getUserLevel(2, 4.5).name).toBe('New');
  });

  it('returns "Regular" for 3 rides and 3.0 rating', () => {
    expect(getUserLevel(3, 3.0).name).toBe('Regular');
  });

  it('returns "New" for 3 rides and 2.9 rating (rating too low for Regular)', () => {
    expect(getUserLevel(3, 2.9).name).toBe('New');
  });

  it('returns "Experienced" for 15 rides and 4.0 rating', () => {
    expect(getUserLevel(15, 4.0).name).toBe('Experienced');
  });

  it('returns "Regular" for 15 rides and 3.9 rating (rating too low for Experienced)', () => {
    expect(getUserLevel(15, 3.9).name).toBe('Regular');
  });

  it('returns "Ambassador" for 50 rides and 4.5 rating', () => {
    expect(getUserLevel(50, 4.5).name).toBe('Ambassador');
  });

  it('returns "Experienced" for 50 rides and 4.4 rating (rating too low for Ambassador)', () => {
    expect(getUserLevel(50, 4.4).name).toBe('Experienced');
  });

  it('returns "Ambassador" for 100 rides and 5.0 rating (highest level)', () => {
    expect(getUserLevel(100, 5.0).name).toBe('Ambassador');
  });

  it('returns "New" for 0 rides and 5.0 rating (rating alone does not promote)', () => {
    expect(getUserLevel(0, 5.0).name).toBe('New');
  });
});

// ---------------------------------------------------------------------------
// USER_LEVELS threshold ordering
// ---------------------------------------------------------------------------
describe('USER_LEVELS thresholds', () => {
  const levelKeys: (keyof typeof USER_LEVELS)[] = [
    'NEW',
    'REGULAR',
    'EXPERIENCED',
    'AMBASSADOR',
  ];

  it('has monotonically increasing minRides thresholds', () => {
    for (let i = 1; i < levelKeys.length; i++) {
      expect(USER_LEVELS[levelKeys[i]].minRides).toBeGreaterThan(
        USER_LEVELS[levelKeys[i - 1]].minRides,
      );
    }
  });

  it('has monotonically non-decreasing minRating thresholds', () => {
    for (let i = 1; i < levelKeys.length; i++) {
      expect(USER_LEVELS[levelKeys[i]].minRating).toBeGreaterThanOrEqual(
        USER_LEVELS[levelKeys[i - 1]].minRating,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// CreateEventSchema validation tests
// ---------------------------------------------------------------------------
describe('CreateEventSchema', () => {
  const validEvent = {
    name: 'Summer Music Festival',
    location_address: 'Prague, Czech Republic',
    location_lat: 50.0755,
    location_lng: 14.4378,
    event_date: '2026-07-15T18:00:00Z',
  };

  it('accepts a valid event', () => {
    const result = CreateEventSchema.parse(validEvent);
    expect(result.name).toBe(validEvent.name);
  });

  it('accepts event with optional description', () => {
    const result = CreateEventSchema.parse({
      ...validEvent,
      description: 'A great festival!',
    });
    expect(result.description).toBe('A great festival!');
  });

  it('rejects missing name', () => {
    const { name: _, ...rest } = validEvent;
    expect(() => CreateEventSchema.parse(rest)).toThrow();
  });

  it('rejects name too short (< 3 chars)', () => {
    expect(() =>
      CreateEventSchema.parse({ ...validEvent, name: 'AB' }),
    ).toThrow();
  });

  it('rejects missing event_date', () => {
    const { event_date: _, ...rest } = validEvent;
    expect(() => CreateEventSchema.parse(rest)).toThrow();
  });

  it('rejects invalid event_date format', () => {
    expect(() =>
      CreateEventSchema.parse({ ...validEvent, event_date: 'not-a-date' }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// CreateRouteIntentSchema validation tests
// ---------------------------------------------------------------------------
describe('CreateRouteIntentSchema', () => {
  const validIntent = {
    origin_address: 'Prague',
    origin_lat: 50.0755,
    origin_lng: 14.4378,
    destination_address: 'Brno',
    destination_lat: 49.1951,
    destination_lng: 16.6068,
    seats_total: 3,
    booking_mode: 'instant' as const,
  };

  it('accepts a valid route intent', () => {
    const result = CreateRouteIntentSchema.parse(validIntent);
    expect(result.origin_address).toBe('Prague');
  });

  it('rejects invalid seats (0)', () => {
    expect(() =>
      CreateRouteIntentSchema.parse({ ...validIntent, seats_total: 0 }),
    ).toThrow();
  });

  it('rejects invalid seats (9 -- above max)', () => {
    expect(() =>
      CreateRouteIntentSchema.parse({ ...validIntent, seats_total: 9 }),
    ).toThrow();
  });

  it('accepts seats at boundaries (1 and 8)', () => {
    expect(
      CreateRouteIntentSchema.parse({ ...validIntent, seats_total: 1 }).seats_total,
    ).toBe(1);
    expect(
      CreateRouteIntentSchema.parse({ ...validIntent, seats_total: 8 }).seats_total,
    ).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// ConfirmRouteIntentSchema validation tests
// ---------------------------------------------------------------------------
describe('ConfirmRouteIntentSchema', () => {
  it('accepts a valid future departure_time', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const result = ConfirmRouteIntentSchema.parse({
      departure_time: futureDate,
    });
    expect(result.departure_time).toBe(futureDate);
  });

  it('rejects past departure_time', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    expect(() =>
      ConfirmRouteIntentSchema.parse({ departure_time: pastDate }),
    ).toThrow();
  });

  it('rejects missing departure_time', () => {
    expect(() => ConfirmRouteIntentSchema.parse({})).toThrow();
  });

  it('accepts optional seats and price', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const result = ConfirmRouteIntentSchema.parse({
      departure_time: futureDate,
      seats_total: 4,
      price_czk: 100,
    });
    expect(result.seats_total).toBe(4);
    expect(result.price_czk).toBe(100);
  });
});
