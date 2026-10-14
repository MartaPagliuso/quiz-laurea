import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { JoinResult, Phase, QuestionData, RevealData, Row } from './models';
import { SocketService } from './socket.service';

const NAME_KEY = 'quiz-player-name';

@Injectable({ providedIn: 'root' })
export class GameService {
  private socketService = inject(SocketService);
  private router = inject(Router);
  private socket = this.socketService.socket;

  readonly name = this.socketService.playerName;
  readonly phase = signal<Phase>('LOBBY');
  readonly question = signal<QuestionData | null>(null);
  readonly yourAnswer = signal<number | null>(null);
  readonly reveal = signal<RevealData | null>(null);
  readonly leaderboard = signal<Row[]>([]);

  readonly outcome = computed<'correct' | 'wrong' | 'timeout' | null>(() => {
    const r = this.reveal();
    if (!r) return null;
    if (r.yourAnswer === null) return 'timeout';
    return r.yourAnswer === r.correct ? 'correct' : 'wrong';
  });

  readonly myPosition = computed(() => this.leaderboard().findIndex((r) => r.name === this.name()) + 1);
  readonly myScore = computed(() => this.leaderboard().find((r) => r.name === this.name())?.score ?? 0);

  // ---- timer allineato all'orologio del server ----
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

  constructor() {
    setInterval(() => this.tick.set(Date.now()), 250);

    this.socket.on('question', (q: QuestionData) => {
      if (!this.name()) return;

      this.offset = q.now - Date.now();
      this.question.set(q);
      this.yourAnswer.set(null);
      this.reveal.set(null);
      this.phase.set('QUESTION');
    });

    this.socket.on('reveal', (r: RevealData) => {
      if (!this.name()) return;
      this.reveal.set(r);
      this.phase.set('REVEAL');
    });
    this.socket.on('final', (d: { leaderboard: Row[] }) => {
      if (!this.name()) return;
      this.leaderboard.set(d.leaderboard);
      this.phase.set('FINAL');
    });
    this.socket.on('reset', () => {
      if (!this.name()) return;
      this.question.set(null);
      this.reveal.set(null);
      this.yourAnswer.set(null);
      this.leaderboard.set([]);
      this.phase.set('LOBBY');
    });

    // connessione persa e ritrovata: rientro automatico con lo stesso nome
    this.socket.on('connect', async () => {
      const name = this.name();
      if (!name) return;
      const res = await this.socketService.join(name);
      if (res.ok) this.applySnapshot(res);
      else this.forgetAndGoHome();
    });
  }

  async join(name: string): Promise<JoinResult> {
    const res = await this.socketService.join(name);
    if (res.ok) {
      this.applySnapshot(res);
      this.saveName(name);
    }
    return res;
  }

  /** Dopo un ricaricamento della pagina rientra col nome salvato in questa scheda. */
  async tryResume(): Promise<boolean> {
    const saved = this.readName();
    if (!saved) return false;
    const res = await this.join(saved);
    if (!res.ok) this.saveName(null);
    return res.ok;
  }

  answer(choice: number): void {
    if (this.phase() !== 'QUESTION' || this.yourAnswer() !== null) return;
    this.yourAnswer.set(choice);
    this.socket.emit('answer', choice);
  }

  private applySnapshot(s: JoinResult): void {
    if (s.question) this.offset = s.question.now - Date.now();
    this.question.set(s.question ?? null);
    this.yourAnswer.set(s.question?.yourAnswer ?? null);
    this.reveal.set(s.reveal ?? null);
    this.leaderboard.set(s.leaderboard ?? []);
    this.phase.set(s.phase ?? 'LOBBY');
  }

  private forgetAndGoHome(): void {
    this.name.set(null);
    this.saveName(null);
    this.router.navigateByUrl('/');
  }

  private readName(): string | null {
    try { return sessionStorage.getItem(NAME_KEY); } catch { return null; }
  }
  private saveName(name: string | null): void {
    try {
      if (name) sessionStorage.setItem(NAME_KEY, name);
      else sessionStorage.removeItem(NAME_KEY);
    } catch { /* storage non disponibile */ }
  }
}