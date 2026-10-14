import { Component, computed, inject } from '@angular/core';
import { formatScore } from '../format';
import { GameService } from '../game.service';

@Component({
  selector: 'app-final',
  templateUrl: './final.html',
})
export class Final {
  game = inject(GameService);
  readonly fmt = formatScore;

  // ordine visivo del podio: 2°, 1°, 3°
  podium = computed(() => {
    const l = this.game.leaderboard();
    return [
      { place: 2, row: l[1], bar: 'h-[88px] bg-[#BFE3E6]', first: false },
      { place: 1, row: l[0], bar: 'h-[120px] bg-brand-orange', first: true },
      { place: 3, row: l[2], bar: 'h-16 bg-[#8FCBD0]', first: false },
    ].filter((s) => s.row !== undefined);
  });

  rest = computed(() => this.game.leaderboard().slice(3));
}