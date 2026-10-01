import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-layout',
  styleUrl: './layout.css',
  templateUrl: './layout.html',
})
export class Layout {
  protected readonly navLinks = [
    { path: '/auth', label: 'Authentification' },
    { path: '/profile', label: 'Profil' },
    { path: '/trip-entry', label: 'Saisie de trajet' },
    { path: '/map', label: 'Carte' },
    { path: '/history', label: 'Historique' },
  ];
}
