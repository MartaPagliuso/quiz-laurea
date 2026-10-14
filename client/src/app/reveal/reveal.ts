import { Component, computed, inject } from '@angular/core';
import { formatScore } from '../format';
import { GameService } from '../game.service';
import { OPTION_LETTERS, optionBadge } from '../option-style';

@Component({
  selector: 'app-reveal',
  templateUrl: './reveal.html',
})
export class Reveal {
  game = inject(GameService);
  readonly letters = OPTION_LETTERS;
  readonly badge = optionBadge;
  readonly fmt = formatScore;

  view = computed(() => {
    switch (this.game.outcome()) {
      case 'correct': return { bg: 'bg-ok', title: 'Corretto!' };
      case 'wrong': return { bg: 'bg-ko', title: 'Sbagliato' };
      default: return { bg: 'bg-brand-ink', title: 'Tempo scaduto!' };
    }
  });

  yourChoice = computed(() => {
    const r = this.game.reveal();
    if (!r || r.yourAnswer === null) return null;
    return `${OPTION_LETTERS[r.yourAnswer]} · ${r.options[r.yourAnswer]}`;
  });
}