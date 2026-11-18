import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SegmentedControl } from './segmented-control';

@Component({
  imports: [SegmentedControl],
  template: `<app-segmented-control
    ariaLabel="Mode d'accès"
    [options]="options"
    [(value)]="selected"
  />`,
})
class Host {
  options = [
    { value: 'login', label: 'Se connecter' },
    { value: 'register', label: 'Créer un compte' },
  ];
  selected = 'login';
}

describe('SegmentedControl', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const radios = (): HTMLInputElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('input[type="radio"]'));
    return { fixture, radios };
  }

  it('exposes a labelled radio group with one radio per option', () => {
    const { fixture, radios } = setup();
    const group = fixture.nativeElement.querySelector('[role="radiogroup"]');
    expect(group.getAttribute('aria-label')).toBe("Mode d'accès");
    expect(radios().length).toBe(2);
  });

  it('checks the option matching the value', () => {
    const { radios } = setup();
    expect(radios()[0].checked).toBe(true);
    expect(radios()[1].checked).toBe(false);
  });

  it('updates the bound value when another option is chosen', () => {
    const { fixture, radios } = setup();
    radios()[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selected).toBe('register');
    expect(radios()[1].checked).toBe(true);
  });
});
