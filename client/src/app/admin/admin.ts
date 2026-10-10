import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../admin.service';
import { formatScore } from '../format';

@Component({
  imports: [FormsModule],
  selector: 'app-admin',
  templateUrl: './admin.html',
})
export class Admin {
  svc = inject(AdminService);

  pin = '';
  confirmReset = signal(false);
  readonly letters = ['A', 'B', 'C', 'D'];
  readonly fmt = formatScore;

  pill = computed(() => {
    const q = this.svc.question();
    switch (this.svc.phase()) {
      case 'LOBBY': return 'Lobby';
      case 'QUESTION': return q ? `Domanda ${q.index + 1} di ${q.total}` : '';
      case 'REVEAL': return q ? `Domanda ${q.index + 1} di ${q.total} · Reveal` : 'Reveal';
      case 'FINAL': return 'Fine';
      default: return '';
    }
  });

  constructor() {
    this.svc.tryAutoLogin();
  }

  login() {
    if (this.pin) this.svc.login(this.pin);
  }

  badgeClass(i: number): string {
    return [
      'bg-brand-teal text-white',
      'bg-brand-orange text-brand-ink',
      'bg-white text-brand-ink',
      'bg-[#BFE3E6] text-brand-ink',
    ][i] ?? 'bg-white text-brand-ink';
  }

  rankClass(i: number): string {
    return i === 0 ? 'bg-brand-orange text-brand-ink' : 'bg-admin-line text-white';
  }

  doReset() {
    this.svc.reset();
    this.confirmReset.set(false);
  }
}
