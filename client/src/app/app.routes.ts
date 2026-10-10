import { Routes } from '@angular/router';
import { Join } from './join/join';
import { Lobby } from './lobby/lobby';
import { Admin } from './admin/admin';

export const routes: Routes = [
  { path: '', component: Join },
  { path: 'lobby', component: Lobby },
  { path: 'admin', component: Admin },
  { path: '**', redirectTo: '' },
];
