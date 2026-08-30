import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/organisation',
    pathMatch: 'full',
  },
  {
    path: 'organisation',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/organisation/list/list').then((c) => c.List),
      },
    ],
  },
];
