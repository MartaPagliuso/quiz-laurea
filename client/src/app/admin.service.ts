import { Injectable, computed, inject, signal } from '@angular/core';
import { SocketService } from './socket.service';

export type AdminPhase = 'LOGIN' | 'LOBBY' | 'QUESTION' | 'REVEAL' | 'FINAL';
export interface Row { name: string; score: number; }
export interface QuestionData {
  index: number; total: number; text: string; options: string[];
  time: number; endsAt: number; now: number;
}
export interface RevealData { index: number; correct: number; top: Row[]; isLast: boolean; }

interface LoginAck {
  ok: boolean;
  phase?: AdminPhase;
  players?: string[];
  total?: number;
  question?: QuestionData | null;
  answered?: number;
  reveal?: RevealData | null;
  leaderboard?: Row[] | null;
}

const PIN_KEY = 'quiz-admin-pin';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private socketService = inject(SocketService);
  private socket = this.socketService.socket;
  private pin: string | null = null;

  readonly players = this.socketService.players;
  readonly phase = signal<AdminPhase>('LOGIN');
  readonly total = signal(0);
  readonly question = signal<QuestionData | null>(null);
  readonly answered = signal(0);
  readonly answeredTotal = signal(0);
  readonly reveal = signal<RevealData | null>(null);
  readonly leaderboard = signal<Row[]>([]);
  readonly loginError = signal<string | null>(null);
  readonly loading = signal(false);

  // orologio allineato al server
  private offset = 0;
  private tick = signal(Date.now());
  private remainingMs = computed(() => {
    const q = this.question();
    return q ? Math.max(0, q.endsAt - (this.tick() + this.offset)) : 0;
  });

  readonly secondsLeft = computed(() => Math.ceil(this.remainingMs() / 1000));
  readonly progress = computed(() => {
    const q = this.question();
    return q ? Math.min(100, (this.remainingMs() / (q.time * 1000)) * 100) : 0;
  });
  readonly answeredPct = computed(() => this.answeredTotal() > 0 ? (this.answered() / this.answeredTotal()) * 100 : 0);

  constructor() {
    setInterval(() => this.tick.set(Date.now()), 250);

    this.socket.on('question', (q: QuestionData) => {
      if (this.phase() === 'LOGIN') return;

      this.offset = q.now - Date.now();
      this.question.set(q);
      this.answered.set(0);
      this.reveal.set(null);
      this.phase.set('QUESTION');
    });
    
    this.socket.on('admin:progress', (p: { answered: number; total: number }) => {
      this.answered.set(p.answered);
      this.answeredTotal.set(p.total);
    });

    this.socket.on('admin:reveal', (r:RevealData) => {
      this.reveal.set(r);
      this.phase.set('REVEAL');
    });

    this.socket.on('final', (d: {leaderboard: Row[] }) => {
      if (this.phase() === 'LOGIN') return;
      this.leaderboard.set(d.leaderboard);
      this.phase.set('FINAL');
    });

    this.socket.on('reset', () => {
      if (this.phase() === 'LOGIN') return;

      this.question.set(null);
      this.reveal.set(null);
      this.phase.set('LOBBY');
    });

    // se il telefono perde la rete e si riconnette, la nuova connessione
    // non è più "regia": rifacciamo il login in automatico
    this.socket.on('connect', () => {
      if (this.pin) this.login(this.pin);
    });
  }

  /** Dopo un ricaricamento della pagina rientra col PIN salvato nella scheda. */
  tryAutoLogin(): void {
    const saved = this.readSaved();
    if (saved && this.phase() === 'LOGIN') this.login(saved);
  }

  async login(pin: string): Promise<boolean> {
    this.loading.set(true);
    this.loginError.set(null);

    const res = await new Promise<LoginAck & { timeout?: boolean }>((resolve) => {
      this.socket.timeout(5000).emit('admin:login', pin, (err: Error | null, r: LoginAck) => {
        resolve(err ? { ok: false, timeout: true } : r);
      });
    });
    this.loading.set(false);

    if (!res.ok) {
      this.pin = null;
      this.save(null);
      this.phase.set('LOGIN');
      this.loginError.set(res.timeout ? 'Server non raggiungibile, riprova' : 'PIN errato');
      return false;
    }

    this.pin = pin;
    this.save(pin);
    this.total.set(res.total ?? 0);
    this.socketService.players.set(res.players ?? []);
    this.answered.set(res.answered ?? 0);
    this.answeredTotal.set(res.players?.length ?? 0);
    if (res.question) {
      this.offset = res.question.now - Date.now();
      this.question.set(res.question);
    }

    this.reveal.set(res.reveal ?? null);
    this.leaderboard.set(res.leaderboard ?? []);
    this.phase.set(res.phase ?? 'LOBBY');
    return true;
  }

  next(): void { this.socket.emit('admin:next'); }
  skip(): void { this.socket.emit('admin:skip'); }
  reset(): void { this.socket.emit('admin:reset'); }

  private readSaved(): string | null {
    try {
      return sessionStorage.getItem(PIN_KEY);
    } catch {
      return null;
    }
  }

  private save(pin: string | null): void {
    try {
      if (pin) sessionStorage.setItem(PIN_KEY, pin);
      else sessionStorage.removeItem(PIN_KEY);
    } catch (error) {}
  }

}