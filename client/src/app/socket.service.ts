import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { JoinResult } from './models';

const TOKEN_KEY = 'quiz-player-token';

@Injectable({ providedIn: 'root' })
export class SocketService {
  readonly socket: Socket = io();
  readonly playerName = signal<string | null>(null);
  readonly players = signal<string[]>([]);
  readonly connected = signal(true);

  private readonly fallbackToken = Math.random().toString(36).slice(2) + Date.now().toString(36);

  constructor() {
    this.socket.on('lobby', (data: { players: string[] }) => this.players.set(data.players));

    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('connect_error', () => this.connected.set(false));
  }

  join(name: string): Promise<JoinResult> {
    return new Promise((resolve) => {
      this.socket.timeout(5000).emit('join', { name, token: this.token() }, (err: Error | null, res: JoinResult) => {
        if (err) return resolve({ ok: false, error: 'Server non raggiungibile, riprova' });
        if (res.ok) this.playerName.set(res.name ?? name);
        resolve(res);
      });
    });
  }

  // codice segreto di questo telefono (uno per scheda del browser)
  private token(): string {
    try {
      let t = sessionStorage.getItem(TOKEN_KEY);
      if (!t) {
        t = this.fallbackToken;
        sessionStorage.setItem(TOKEN_KEY, t);
      }
      return t;
    } catch {
      return this.fallbackToken;
    }
  }
}