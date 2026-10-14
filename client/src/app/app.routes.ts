import { Routes } from '@angular/router';
import { Join } from './join/join';
import { Play } from './play/play';
import { Admin } from './admin/admin';

export const routes: Routes = [
  { path: '', component: Join },
  { path: 'play', component: Play },
  { path: 'admin', component: Admin },
  { path: '**', redirectTo: '' },
];