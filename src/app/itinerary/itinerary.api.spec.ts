import { toItineraryRequest, toItineraryResult } from './itinerary.api';

describe('toItineraryRequest', () => {
  it('sends start, end and the wheelchair fields of the saved profile', () => {
    expect(
      toItineraryRequest('48.8566,2.3522', '10 rue de Rivoli, Paris', {
        profile: 'manual-wheelchair',
        wheelchairModel: 'Invacare — Action',
        wheelchairModelId: 'invacare-action-kuschall',
        wheelchairWidthM: 0.7,
        strength: 'low',
        accompanied: true,
      }),
    ).toEqual({
      start: '48.8566,2.3522',
      end: '10 rue de Rivoli, Paris',
      mobility_profile: 1,
      wheelchair_width: 0.7,
      physical_strength: 0,
      is_accompanied: true,
    });
  });

  it('sends can_climb_stairs for assisted walking', () => {
    expect(
      toItineraryRequest('A', 'B', { profile: 'assisted-walking', canClimbStairs: false }),
    ).toEqual({ start: 'A', end: 'B', mobility_profile: 2, can_climb_stairs: false });
  });

  it('sends is_accompanied for a visually impaired person', () => {
    expect(
      toItineraryRequest('A', 'B', { profile: 'visually-impaired', accompanied: true }),
    ).toEqual({ start: 'A', end: 'B', mobility_profile: 3, is_accompanied: true });
  });

  it('sends the path preferences bitmask for a pedestrian', () => {
    expect(
      toItineraryRequest('A', 'B', {
        profile: 'pedestrian',
        stairsOrSlopes: 'none',
        preferWidePaths: false,
        preferLitStreets: true,
        requireBenches: true,
      }),
    ).toEqual({ start: 'A', end: 'B', mobility_profile: 0, path_preferences: 24 });
  });

  it('sends only mobility_profile 0 for a stroller', () => {
    expect(toItineraryRequest('A', 'B', { profile: 'stroller' })).toEqual({
      start: 'A',
      end: 'B',
      mobility_profile: 0,
    });
  });

  it('never sends the profile-only fields (consent, app_profile, wheelchair_model_id)', () => {
    const body = toItineraryRequest('A', 'B', {
      profile: 'electric-wheelchair',
      wheelchairModel: 'Permobil M3',
      wheelchairModelId: 'permobil-m3',
      wheelchairWidthM: 0.68,
      strength: 'high',
      accompanied: false,
    });
    expect(body).not.toHaveProperty('consent');
    expect(body).not.toHaveProperty('app_profile');
    expect(body).not.toHaveProperty('wheelchair_model_id');
  });
});

describe('toItineraryResult', () => {
  it('keeps the ordered points', () => {
    expect(
      toItineraryResult({
        points: [
          { lat: 48.8566, lng: 2.3522 },
          { lat: 48.8606, lng: 2.3376 },
        ],
      }),
    ).toEqual({
      points: [
        { lat: 48.8566, lng: 2.3522 },
        { lat: 48.8606, lng: 2.3376 },
      ],
    });
  });

  it('accepts an empty route', () => {
    expect(toItineraryResult({ points: [] })).toEqual({ points: [] });
  });

  it('rejects a body that does not match the contract', () => {
    expect(() => toItineraryResult(null)).toThrow();
    expect(() => toItineraryResult({ points: [{ lat: '48', lng: 2 }] })).toThrow();
  });
});
