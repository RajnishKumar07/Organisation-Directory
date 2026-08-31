import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/organisations',
    pathMatch: 'full',
  },
  {
    path: 'organisations',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/organisation/list/list').then((c) => c.List),
      },
      {
        path: 'add',
        loadComponent: () => import('./pages/organisation/add/add').then((p) => p.Add),
      },
    ],
  },
];
