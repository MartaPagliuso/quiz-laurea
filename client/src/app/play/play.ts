import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Final } from '../final/final';
import { GameService } from '../game.service';
import { Lobby } from '../lobby/lobby';
import { Question } from '../question/question';
import { Reveal } from '../reveal/reveal';

@Component({
  selector: 'app-play',
  imports: [Lobby, Question, Reveal, Final],
  templateUrl: './play.html',
})
export class Play {
  game = inject(GameService);
  private router = inject(Router);

  constructor() {
    // ricaricando la pagina si perde il nome: si passa dal join, che ti rimette dentro da solo
    if (!this.game.name()) this.router.navigateByUrl('/');
  }
}