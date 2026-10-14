import { Component, computed, inject } from '@angular/core';
import { GameService } from '../game.service';
import { OPTION_LETTERS, optionBadge } from '../option-style';

@Component({
  selector: 'app-question',
  templateUrl: './question.html',
})
export class Question {
  game = inject(GameService);
  readonly letters = OPTION_LETTERS;
  readonly badge = optionBadge;

  answered = computed(() => this.game.yourAnswer() !== null);

  optionClass(i: number): string {
    const chosen = this.game.yourAnswer();
    if (chosen === null) return 'border-brand-line bg-white shadow-[0_4px_0_#C9DDE0]';
    return chosen === i
      ? 'border-brand-teal bg-[#E6F3F4] shadow-[0_4px_0_#177C85]'
      : 'border-brand-line bg-white opacity-50 shadow-[0_4px_0_#C9DDE0]';
  }
}