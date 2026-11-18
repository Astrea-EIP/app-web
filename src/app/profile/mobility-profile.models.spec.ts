import {
  DEFAULT_FORM_VALUE,
  MOBILITY_PROFILE_IDS,
  MobilityProfileFormValue,
  buildProfileData,
  buildRecapRows,
  formatWidth,
  toFormValue,
  toMobilityProfileCode,
} from './mobility-profile.models';

const form = (patch: Partial<MobilityProfileFormValue>): MobilityProfileFormValue => ({
  ...DEFAULT_FORM_VALUE,
  ...patch,
});

describe('mobility profile models', () => {
  it('maps every profile to the mobility_profile code of the mock-up', () => {
    expect(toMobilityProfileCode('manual-wheelchair')).toBe(1);
    expect(toMobilityProfileCode('electric-wheelchair')).toBe(1);
    expect(toMobilityProfileCode('assisted-walking')).toBe(2);
    expect(toMobilityProfileCode('pedestrian')).toBe(0);
    expect(toMobilityProfileCode('stroller')).toBe(0);
    expect(toMobilityProfileCode('visually-impaired')).toBe(3);
    expect(MOBILITY_PROFILE_IDS).toHaveLength(6);
  });

  it('returns null without a selected profile', () => {
    expect(buildProfileData(form({ profile: null }))).toBeNull();
  });

  it('keeps only the wheelchair fields for a wheelchair profile', () => {
    const data = buildProfileData(
      form({
        profile: 'electric-wheelchair',
        wheelchairModel: '  Invacare Action  ',
        strength: 'high',
        accompanied: true,
        canClimbStairs: true,
        requireBenches: true,
      }),
    );
    expect(data).toEqual({
      profile: 'electric-wheelchair',
      wheelchairModel: 'Invacare Action',
      wheelchairWidthM: 0.7,
      strength: 'high',
      accompanied: true,
    });
  });

  it('keeps only the relevant fields for the other profiles', () => {
    expect(buildProfileData(form({ profile: 'assisted-walking', canClimbStairs: true }))).toEqual({
      profile: 'assisted-walking',
      canClimbStairs: true,
    });
    expect(
      buildProfileData(
        form({ profile: 'pedestrian', stairsOrSlopes: 'slopes', requireBenches: true }),
      ),
    ).toEqual({
      profile: 'pedestrian',
      stairsOrSlopes: 'slopes',
      preferWidePaths: false,
      preferLitStreets: false,
      requireBenches: true,
    });
    expect(buildProfileData(form({ profile: 'stroller', accompanied: true }))).toEqual({
      profile: 'stroller',
    });
    expect(buildProfileData(form({ profile: 'visually-impaired', accompanied: true }))).toEqual({
      profile: 'visually-impaired',
      accompanied: true,
    });
  });

  it('round-trips through toFormValue', () => {
    for (const value of [
      form({ profile: 'manual-wheelchair', wheelchairModel: 'Küschall', strength: 'low' }),
      form({ profile: 'pedestrian', stairsOrSlopes: 'stairs', preferLitStreets: true }),
      form({ profile: 'assisted-walking', canClimbStairs: true }),
      form({ profile: 'visually-impaired', accompanied: true }),
      form({ profile: 'stroller' }),
    ]) {
      expect(toFormValue(buildProfileData(value)!)).toEqual(value);
    }
  });

  it('formats the width in French', () => {
    expect(formatWidth(0.7)).toBe('0,70 m');
  });

  it('builds the accessibility passport rows', () => {
    const rows = buildRecapRows(
      buildProfileData(
        form({
          profile: 'manual-wheelchair',
          wheelchairModel: 'Invacare — Action',
          accompanied: true,
        }),
      )!,
    );
    expect(rows).toEqual([
      { label: 'Mode de mobilité', value: 'Fauteuil manuel' },
      { label: 'Modèle de fauteuil', value: 'Invacare — Action (0,70 m)' },
      { label: 'Force physique', value: 'Moyenne' },
      { label: 'Je suis accompagné(e)', value: 'Oui' },
    ]);
    expect(buildRecapRows({ profile: 'stroller' })).toHaveLength(1);
  });
});
