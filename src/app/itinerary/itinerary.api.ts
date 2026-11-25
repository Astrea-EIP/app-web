import { ProfileRequest, toProfileRequest } from '../profile/mobility-profile.api';
import { MobilityProfileData } from '../profile/mobility-profile.models';
import { ItineraryPoint, ItineraryResult } from './itinerary.service';

/**
 * Contrat de `POST /v0/itinerary` (api-back, `docs/api.md` et `docs/api.json`).
 *
 * Le profil enregistré a les mêmes noms de champs que la demande d'itinéraire (décision 0004) : on
 * reprend `toProfileRequest` et on retire ce qui n'appartient qu'au profil.
 */
export interface ItineraryApiRequest extends Omit<
  ProfileRequest,
  'consent' | 'app_profile' | 'wheelchair_model_id'
> {
  /** « lat,lng » (point décimal) ou adresse libre. */
  start: string;
  end: string;
}

/** `ItineraryResponse` d'api-back : les points du trajet, dans l'ordre, du départ à l'arrivée. */
export interface ItineraryApiResponse {
  points: { lat: number; lng: number }[];
}

/** Corps de `POST /v0/itinerary` : départ, arrivée et champs du profil choisi. */
export function toItineraryRequest(
  origin: string,
  destination: string,
  data: MobilityProfileData,
): ItineraryApiRequest {
  const { consent, app_profile, wheelchair_model_id, ...profile } = toProfileRequest(data);
  return { start: origin, end: destination, ...profile };
}

function isPoint(value: unknown): value is ItineraryPoint {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { lat, lng } = value as Record<string, unknown>;
  return typeof lat === 'number' && typeof lng === 'number';
}

/** Réponse `201` → résultat de l'app. Lève une erreur si le corps ne suit pas le contrat. */
export function toItineraryResult(body: unknown): ItineraryResult {
  const points = (body as Partial<ItineraryApiResponse> | null)?.points;
  if (!Array.isArray(points) || !points.every(isPoint)) {
    throw new Error('Réponse de POST /v0/itinerary hors contrat : points attendus.');
  }
  return { points: points.map(({ lat, lng }) => ({ lat, lng })) };
}
