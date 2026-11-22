import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
}

let nextId = 0;

/**
 * Contrôle segmenté (Figma « SegmentedControl ») : groupe de boutons radio, une option choisie.
 * Les flèches du clavier passent d'une option à l'autre (comportement natif des radios).
 */
@Component({
  selector: 'app-segmented-control',
  templateUrl: './segmented-control.html',
  styleUrl: './segmented-control.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedControl {
  readonly options = input.required<readonly SegmentedOption[]>();
  readonly ariaLabel = input.required<string>();
  readonly value = model<string>();

  protected readonly name = `app-segmented-${nextId++}`;

  protected select(value: string): void {
    this.value.set(value);
  }
}
