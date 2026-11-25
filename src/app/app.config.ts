import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AccountService } from './auth/account.service';
import { HttpAccountService } from './auth/http-account.service';
import { provideI18n } from './i18n/i18n';
import { HttpItineraryService } from './itinerary/http-itinerary.service';
import { ITINERARY_SERVICE } from './itinerary/itinerary.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes),
    { provide: AccountService, useExisting: HttpAccountService },
    { provide: ITINERARY_SERVICE, useExisting: HttpItineraryService },
    provideI18n(),
  ],
};
