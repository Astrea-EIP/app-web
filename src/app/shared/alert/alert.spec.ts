import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Alert, AlertTone } from './alert';

@Component({
  imports: [Alert],
  template: `<app-alert [tone]="tone" title="Connexion impossible"
    >Réessayez dans un instant.</app-alert
  >`,
})
class Host {
  tone: AlertTone = 'error';
}

describe('Alert', () => {
  function setup(tone: AlertTone) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.tone = tone;
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('app-alert') as HTMLElement;
  }

  it('announces an error immediately with an icon, a title and a message', () => {
    const alert = setup('error');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.querySelector('svg')).not.toBeNull();
    expect(alert.textContent).toContain('Connexion impossible');
    expect(alert.textContent).toContain('Réessayez dans un instant.');
  });

  it('announces info politely', () => {
    const alert = setup('info');
    expect(alert.getAttribute('role')).toBe('status');
    expect(alert.classList).toContain('alert--info');
  });
});
