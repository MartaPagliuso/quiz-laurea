import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameService } from '../game.service';

@Component({
  selector: 'app-join',
  imports: [FormsModule],
  templateUrl: './join.html',
})
export class Join {
  private game = inject(GameService);
  private router = inject(Router);

  name = '';
  error = signal<string | null>(null);
  loading = signal(false);
  closed = computed(() => this.error() === 'Il gioco è già iniziato');

  constructor() {
    this.resume();
  }

  // se ricarichi la pagina a partita in corso, rientri da solo
  private async resume() {
    this.loading.set(true);
    const ok = await this.game.tryResume();
    this.loading.set(false);
    if (ok) this.router.navigateByUrl('/play');
  }

  async enter() {
    const name = this.name.trim();
    if (!name) {
      this.error.set('Inserisci un nome');
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    const res = await this.game.join(name);
    this.loading.set(false);

    if (res.ok) this.router.navigateByUrl('/play');
    else this.error.set(res.error ?? 'Qualcosa è andato storto');
  }
}