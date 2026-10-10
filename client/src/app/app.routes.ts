import { Routes } from '@angular/router';
import { Join } from './join/join';
import { Lobby } from './lobby/lobby';

export const routes: Routes = [
  { path: '', component: Join },
  { path: 'lobby', component: Lobby },
  { path: '**', redirectTo: '' },
];
