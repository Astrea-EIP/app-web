import { TestBed } from '@angular/core/testing';
import { ITINERARY_SERVICE, ItineraryError, NotWiredItineraryService } from './itinerary.service';

describe('ITINERARY_SERVICE', () => {
  it('is not wired to the API by default', async () => {
    const service = TestBed.inject(ITINERARY_SERVICE);
    expect(service).toBeInstanceOf(NotWiredItineraryService);
    await expect(service.compute({ origin: 'A', destination: 'B' })).rejects.toThrow(/non branché/);
  });

  it('carries the error kind and details', () => {
    const error = new ItineraryError('address-not-found', { field: 'destination', address: 'X' });
    expect(error.kind).toBe('address-not-found');
    expect(error.details.address).toBe('X');
  });
});
