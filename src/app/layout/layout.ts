import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
  selector: 'app-layout',
  styleUrl: './layout.css',
  templateUrl: './layout.html',
})
export class Layout {
  protected readonly navLinks = [
    { path: '/auth', labelKey: 'nav.auth' },
    { path: '/profile', labelKey: 'nav.profile' },
    { path: '/trip-entry', labelKey: 'nav.tripEntry' },
    { path: '/map', labelKey: 'nav.map' },
    { path: '/history', labelKey: 'nav.history' },
  ];
}
