import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button } from './button';

@Component({
  imports: [Button],
  template: `<button
    appButton
    [variant]="variant"
    [loading]="loading"
    [disabled]="disabled"
    (click)="clicks = clicks + 1"
  >
    Valider
  </button>`,
})
class Host {
  variant: 'primary' | 'secondary' = 'primary';
  loading = false;
  disabled = false;
  clicks = 0;
}

describe('Button', () => {
  function setup(props: Partial<Host> = {}) {
    const fixture = TestBed.createComponent(Host);
    Object.assign(fixture.componentInstance, props);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    return { fixture, button };
  }

  it('applies the primary variant by default', () => {
    const { button } = setup();
    expect(button.classList).toContain('app-button--primary');
    expect(button.textContent).toContain('Valider');
  });

  it('applies the secondary variant', () => {
    const { button } = setup({ variant: 'secondary' });
    expect(button.classList).toContain('app-button--secondary');
  });

  it('emits click when enabled', () => {
    const { fixture, button } = setup();
    button.click();
    expect(fixture.componentInstance.clicks).toBe(1);
  });

  it('blocks click and announces the state when loading', () => {
    const { fixture, button } = setup({ loading: true });
    button.click();
    expect(fixture.componentInstance.clicks).toBe(0);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.querySelector('.app-button__spinner')).not.toBeNull();
  });

  it('blocks click when disabled but keeps the button focusable', () => {
    const { fixture, button } = setup({ disabled: true });
    button.click();
    expect(fixture.componentInstance.clicks).toBe(0);
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });
});
