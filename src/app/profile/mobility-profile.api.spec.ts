import { MobilityProfileData } from './mobility-profile.models';
import {
  PATH_PREFERENCE,
  ProfileResponse,
  fromProfileResponse,
  toProfileRequest,
} from './mobility-profile.api';

const wheelchair: MobilityProfileData = {
  profile: 'electric-wheelchair',
  wheelchairModel: 'Invacare — Action, Küschall',
  wheelchairModelId: 'invacare-action-kuschall',
  wheelchairWidthM: 0.7,
  strength: 'high',
  accompanied: true,
};

const response = (fields: Partial<ProfileResponse>): ProfileResponse => ({
  consent: true,
  mobility_profile: 0,
  consent_given_at: '2026-11-21T10:00:00Z',
  updated_at: '2026-11-21T10:05:00Z',
  ...fields,
});

describe('toProfileRequest', () => {
  it('maps a wheelchair profile with model id, width, strength and companion', () => {
    expect(toProfileRequest(wheelchair)).toEqual({
      consent: true,
      app_profile: 'electric-wheelchair',
      mobility_profile: 1,
      wheelchair_model_id: 'invacare-action-kuschall',
      wheelchair_width: 0.7,
      physical_strength: 2,
      is_accompanied: true,
    });
  });

  it('omits the model id when none is chosen and keeps the width', () => {
    const request = toProfileRequest({ ...wheelchair, wheelchairModelId: undefined });
    expect('wheelchair_model_id' in request).toBe(false);
    expect(request.wheelchair_width).toBe(0.7);
  });

  it.each([
    ['low', 0],
    ['medium', 1],
    ['high', 2],
  ] as const)('maps strength %s to %i', (strength, code) => {
    expect(toProfileRequest({ ...wheelchair, strength }).physical_strength).toBe(code);
  });

  it('maps assisted walking to crutches with can_climb_stairs only', () => {
    expect(toProfileRequest({ profile: 'assisted-walking', canClimbStairs: true })).toEqual({
      consent: true,
      app_profile: 'assisted-walking',
      mobility_profile: 2,
      can_climb_stairs: true,
    });
  });

  it('maps a visually impaired user to profile 3 with is_accompanied only', () => {
    expect(toProfileRequest({ profile: 'visually-impaired', accompanied: false })).toEqual({
      consent: true,
      app_profile: 'visually-impaired',
      mobility_profile: 3,
      is_accompanied: false,
    });
  });

  it('keeps the stroller distinguishable from the pedestrian through app_profile', () => {
    expect(toProfileRequest({ profile: 'stroller' })).toEqual({
      consent: true,
      app_profile: 'stroller',
      mobility_profile: 0,
    });
  });

  it('encodes pedestrian preferences as a bitmask', () => {
    const base: Extract<MobilityProfileData, { profile: 'pedestrian' }> = {
      profile: 'pedestrian',
      stairsOrSlopes: 'none',
      preferWidePaths: false,
      preferLitStreets: false,
      requireBenches: false,
    };
    const mask = (data: Partial<typeof base>) =>
      toProfileRequest({ ...base, ...data }).path_preferences;

    expect(mask({})).toBe(0);
    expect(mask({ stairsOrSlopes: 'stairs' })).toBe(PATH_PREFERENCE.Stairs);
    expect(mask({ stairsOrSlopes: 'slopes' })).toBe(PATH_PREFERENCE.Slopes);
    expect(mask({ preferWidePaths: true })).toBe(4);
    expect(mask({ preferLitStreets: true, requireBenches: true })).toBe(24);
    expect(
      mask({
        stairsOrSlopes: 'slopes',
        preferWidePaths: true,
        preferLitStreets: true,
        requireBenches: true,
      }),
    ).toBe(30);
  });
});

describe('fromProfileResponse', () => {
  it('round-trips every profile through the API shape', () => {
    const profiles: MobilityProfileData[] = [
      wheelchair,
      { ...wheelchair, profile: 'manual-wheelchair', strength: 'low', accompanied: false },
      { profile: 'assisted-walking', canClimbStairs: false },
      { profile: 'visually-impaired', accompanied: true },
      { profile: 'stroller' },
      {
        profile: 'pedestrian',
        stairsOrSlopes: 'slopes',
        preferWidePaths: true,
        preferLitStreets: false,
        requireBenches: true,
      },
    ];
    for (const data of profiles) {
      const request = toProfileRequest(data);
      const stored = fromProfileResponse(
        {
          ...request,
          consent_given_at: '2026-11-21T10:00:00Z',
          updated_at: '2026-11-21T10:05:00Z',
        },
        () => 'Invacare — Action, Küschall',
      );
      expect(stored.data).toEqual(data);
    }
  });

  it('returns the consent date of the account', () => {
    expect(fromProfileResponse(response({}), () => undefined).consentGivenAt).toBe(
      '2026-11-21T10:00:00Z',
    );
  });

  it('falls back to the default app profile of the mobility code when app_profile is missing', () => {
    const profileOf = (code: 0 | 1 | 2 | 3) =>
      fromProfileResponse(
        response({ mobility_profile: code, wheelchair_width: 0.7 }),
        () => undefined,
      ).data.profile;
    expect([0, 1, 2, 3].map((c) => profileOf(c as 0 | 1 | 2 | 3))).toEqual([
      'pedestrian',
      'manual-wheelchair',
      'assisted-walking',
      'visually-impaired',
    ]);
  });

  it('ignores an app_profile that contradicts mobility_profile', () => {
    const { data } = fromProfileResponse(
      response({ app_profile: 'stroller', mobility_profile: 3 }),
      () => undefined,
    );
    expect(data.profile).toBe('visually-impaired');
  });

  it('uses the model id as label when the catalogue does not know it', () => {
    const { data } = fromProfileResponse(
      response({
        app_profile: 'manual-wheelchair',
        mobility_profile: 1,
        wheelchair_model_id: 'unknown-model',
        wheelchair_width: 0.65,
      }),
      () => undefined,
    );
    expect(data).toMatchObject({ wheelchairModel: 'unknown-model', wheelchairWidthM: 0.65 });
  });
});
