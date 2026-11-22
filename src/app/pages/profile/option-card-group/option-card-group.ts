import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type OptionIcon = 'wheelchair' | 'bolt' | 'cane' | 'person' | 'cart' | 'eye';

export interface OptionCardDefinition {
  value: string;
  label: string;
  description: string;
  icon?: OptionIcon;
}

let nextId = 0;

/**
 * Cartes-options sélectionnables (Figma « ProfileOption » / OptionCard) : groupe de boutons radio,
 * une carte choisie. Variante avec icône et pastille radio pour les profils, variante simple sinon.
 * Créé localement car `src/app/shared` ne l'expose pas encore.
 */
@Component({
  selector: 'app-option-card-group',
  templateUrl: './option-card-group.html',
  styleUrl: './option-card-group.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => OptionCardGroup), multi: true },
  ],
  host: { '[style.--option-columns]': 'columns()' },
})
export class OptionCardGroup implements ControlValueAccessor {
  readonly options = input.required<readonly OptionCardDefinition[]>();
  readonly ariaLabel = input.required<string>();
  readonly columns = input<2 | 3>(2);
  readonly invalid = input(false);
  readonly errorId = input<string | null>(null);

  protected readonly name = `app-option-group-${nextId++}`;
  protected readonly value = signal<string | null>(null);
  protected readonly isDisabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected select(value: string): void {
    this.value.set(value);
    this.onChange(value);
  }

  protected touched(): void {
    this.onTouched();
  }
}
