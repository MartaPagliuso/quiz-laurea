import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../socket.service';

@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.html',
})
export class Lobby {
  private socketService = inject(SocketService);
  private router = inject(Router);

  name = this.socketService.playerName;

  // io per prima, poi gli altri per ordine di arrivo
  players = computed(() => {
    const me = this.name();
    const all = this.socketService.players();
    return [...all.filter((p) => p === me), ...all.filter((p) => p !== me)];
  });

  constructor() {
    // se arrivi qui senza esserti registrata (es. ricarichi la pagina), torni al join
    if (!this.name())
      this.router.navigateByUrl('/');
  }

  initial(name: string): string {
    return (Array.from(name)[0] ?? '?').toUpperCase();
  }
}
