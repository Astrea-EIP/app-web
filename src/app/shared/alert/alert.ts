import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AlertTone = 'error' | 'info';

/**
 * Alerte en ligne (icône + texte, jamais la couleur seule).
 * Tons limités à `error` et `info` : les tokens warning et succès n'existent pas encore (ticket docs à créer).
 */
@Component({
  selector: 'app-alert',
  templateUrl: './alert.html',
  styleUrl: './alert.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.alert--error]': "tone() === 'error'",
    '[class.alert--info]': "tone() === 'info'",
    '[attr.role]': 'role()',
  },
})
export class Alert {
  readonly tone = input<AlertTone>('info');
  readonly title = input<string | null>(null);

  /** Une erreur est annoncée immédiatement ; une info reste polie. */
  protected readonly role = computed(() => (this.tone() === 'error' ? 'alert' : 'status'));
}
