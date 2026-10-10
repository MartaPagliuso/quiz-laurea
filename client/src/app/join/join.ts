import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SocketService } from '../socket.service';

@Component({
  imports: [FormsModule],
  selector: 'app-join',
  templateUrl: './join.html',
})
export class Join {
  private socketService = inject(SocketService);
  private router = inject(Router);

  name = '';
  error = signal<string|null>(null);
  loading = signal(false);
  closed = computed(() => this.error() === 'Il gioco è già iniziato');

  async enter() {
    const name = this.name.trim();
    if (!name) {
      this.error.set('Inserisci un nome.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const res = await this.socketService.join(name);
    this.loading.set(false);

    if (res.ok) {
      // per ora andiamo in lobby, poi cambiamo
      this.router.navigateByUrl('/lobby');
    } else {
      this.error.set(res.error ?? 'Qualcosa è andato storto');
    }
  }
}
