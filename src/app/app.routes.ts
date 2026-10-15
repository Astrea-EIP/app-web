import { Routes } from '@angular/router';

import { Auth } from './pages/auth/auth';
import { Profile } from './pages/profile/profile';
import { TripEntry } from './pages/trip-entry/trip-entry';
import { Map } from './pages/map/map';
import { History } from './pages/history/history';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth' },
  { path: 'auth', component: Auth },
  { path: 'profile', component: Profile },
  { path: 'trip-entry', component: TripEntry },
  { path: 'map', component: Map },
  { path: 'history', component: History },
];
