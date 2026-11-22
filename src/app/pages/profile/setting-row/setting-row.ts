import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Ligne de réglage à bascule (Figma « SettingRow » Type=Toggle + « Toggle »).
 * Interrupteur natif (`role="switch"`) compatible formulaires réactifs.
 * Créé localement car `src/app/shared` ne l'expose pas encore.
 */
@Component({
  selector: 'app-setting-row',
  templateUrl: './setting-row.html',
  styleUrl: './setting-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SettingRow), multi: true },
  ],
})
export class SettingRow implements ControlValueAccessor {
  readonly label = input.required<string>();

  protected readonly checked = signal(false);
  protected readonly isDisabled = signal(false);

  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: boolean | null): void {
    this.checked.set(!!value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected toggle(event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.checked.set(value);
    this.onChange(value);
  }

  protected blurred(): void {
    this.onTouched();
  }
}
