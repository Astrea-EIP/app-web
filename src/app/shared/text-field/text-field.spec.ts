import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TextField } from './text-field';

@Component({
  imports: [TextField, ReactiveFormsModule],
  template: `<app-text-field
    label="Adresse e-mail"
    type="email"
    [hint]="hint"
    [error]="error"
    [formControl]="control"
  />`,
})
class Host {
  control = new FormControl('');
  hint: string | null = null;
  error: string | null = null;
}

describe('TextField', () => {
  function setup(props: Partial<Host> = {}) {
    const fixture = TestBed.createComponent(Host);
    Object.assign(fixture.componentInstance, props);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const input: HTMLInputElement = root.querySelector('input')!;
    return { fixture, root, input };
  }

  it('links the label to the input', () => {
    const { root, input } = setup();
    const label = root.querySelector('label')!;
    expect(label.getAttribute('for')).toBe(input.id);
    expect(label.textContent).toContain('Adresse e-mail');
    expect(input.type).toBe('email');
  });

  it('writes typed values to the form control', () => {
    const { fixture, input } = setup();
    input.value = 'camille@example.org';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.control.value).toBe('camille@example.org');
  });

  it('shows control value changes in the input', () => {
    const { fixture, input } = setup();
    fixture.componentInstance.control.setValue('a@b.fr');
    fixture.detectChanges();
    expect(input.value).toBe('a@b.fr');
  });

  it('marks the field invalid and describes it with the error message', () => {
    const { root, input } = setup({ error: 'Adresse e-mail invalide.' });
    const error = root.querySelector('.field__error')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
    expect(error.textContent).toContain('Adresse e-mail invalide.');
    expect(error.querySelector('svg')).not.toBeNull();
  });

  it('is not marked invalid without error', () => {
    const { input } = setup({ hint: 'Utilisée pour vous connecter.' });
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toContain('hint');
  });

  it('can be disabled through the form control', () => {
    const { fixture, input } = setup();
    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect(input.disabled).toBe(true);
  });
});
