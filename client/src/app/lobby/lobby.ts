import { Component, computed, inject } from '@angular/core';
import { SocketService } from '../socket.service';

@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.html',
})
export class Lobby {
  private socketService = inject(SocketService);

  name = this.socketService.playerName;

  players = computed(() => {
    const me = this.name();
    const all = this.socketService.players();
    return [...all.filter((p) => p === me), ...all.filter((p) => p !== me)];
  });

  initial(name: string): string {
    return (Array.from(name)[0] ?? '?').toUpperCase();
  }
}