import { firstValueFrom } from 'rxjs';
import { AccountError } from './account.models';
import { UnavailableAccountService } from './account.service';

describe('UnavailableAccountService', () => {
  const service = new UnavailableAccountService();

  it('rejects login with a typed unavailable error', async () => {
    const err = await firstValueFrom(service.login()).catch((e) => e);
    expect(err).toBeInstanceOf(AccountError);
    expect(err.code).toBe('unavailable');
  });

  it('rejects register with a typed unavailable error', async () => {
    const err = await firstValueFrom(service.register()).catch((e) => e);
    expect(err).toBeInstanceOf(AccountError);
    expect(err.code).toBe('unavailable');
  });
});
