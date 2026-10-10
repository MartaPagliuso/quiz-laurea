import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';

export interface JoinResult {
  ok: boolean;
  error?: string;
  name?: string;
  phase?: string;
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  readonly socket: Socket = io();
  readonly playerName = signal<string | null>(null);
  readonly players = signal<string[]>([]);

  constructor() {
    this.socket.on('lobby', (data: { players: string[] }) => {
      this.players.set(data.players);
    });
  }

  join(name: string): Promise<JoinResult> {
    return new Promise((resolve) => {
      this.socket.timeout(5000).emit('join', name, (err: Error | null, res: JoinResult) => {
        if (err) {
          return resolve({ ok: false, error: 'Server non raggiungibile, riprova' });
        }

        if (res.ok) this.playerName.set(res.name ?? name);
        resolve(res);
      });
    });
  }
}