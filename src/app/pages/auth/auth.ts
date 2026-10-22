import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../auth/auth.service';

@Component({
  imports: [],
  selector: 'app-auth',
  styleUrl: './auth.css',
  templateUrl: './auth.html',
})
export class Auth {
  readonly status = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  private readonly authService = inject(AuthService);

  testAuthentication(): void {
    this.status.set('loading');

    this.authService.getAnonymousToken().subscribe({
      next: () => {
        this.status.set('success');
      },
      error: () => {
        this.status.set('error');
      },
    });
  }
}
