import { TestBed } from '@angular/core/testing';
import { ITINERARY_SERVICE, ItineraryError, NotWiredItineraryService } from './itinerary.service';

describe('ITINERARY_SERVICE', () => {
  it('is not wired to the API by default', async () => {
    const service = TestBed.inject(ITINERARY_SERVICE);
    expect(service).toBeInstanceOf(NotWiredItineraryService);
    await expect(service.compute({ origin: 'A', destination: 'B' })).rejects.toThrow(/non branché/);
  });

  it('carries the error kind and details', () => {
    const error = new ItineraryError('server', { errorId: 'abc' });
    expect(error.kind).toBe('server');
    expect(error.details.errorId).toBe('abc');
  });
});
