import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
} from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary';

/**
 * Bouton Astrea (Figma « Button » : Primary / Secondary).
 * À utiliser sur un élément natif : `<button appButton variant="secondary">Libellé</button>`.
 */
@Component({
  selector: 'button[appButton], a[appButton]',
  templateUrl: './button.html',
  styleUrl: './button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-button',
    '[class.app-button--primary]': "variant() === 'primary'",
    '[class.app-button--secondary]': "variant() === 'secondary'",
    '[class.app-button--loading]': 'loading()',
    '[attr.aria-busy]': 'loading() ? "true" : null',
    '[attr.aria-disabled]': 'blocked() ? "true" : null',
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly loading = input(false);
  readonly disabled = input(false);

  protected readonly blocked = computed(() => this.disabled() || this.loading());

  constructor() {
    /**
     * `aria-disabled` plutôt que `disabled` : le bouton reste focalisable et annoncé.
     * Écoute en capture pour passer avant les `(click)` posés par le parent.
     */
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.addEventListener(
      'click',
      (event) => {
        if (this.blocked()) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
  }
}
