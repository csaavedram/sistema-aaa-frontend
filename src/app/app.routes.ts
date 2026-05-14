import { Component } from '@angular/core';
import { RouterLink, Routes } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

// ---------------------------------------------------------------------------
// Inline component — keeps the 404/403 handling self-contained
// ---------------------------------------------------------------------------
@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  template: `
    <div class="u-wrapper">
      <span class="u-code">403</span>
      <p class="u-message">No tienes permisos para acceder a esta página.</p>
      <a mat-raised-button color="primary" routerLink="/admin/users">Ir al inicio</a>
    </div>
  `,
  styles: [`
    .u-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      text-align: center;
      background: #f5f5f5;
    }
    .u-code   { font-size: 80px; font-weight: 700; color: #bdbdbd; line-height: 1; }
    .u-message { font-size: 17px; color: #616161; margin: 0; }
  `],
})
class UnauthorizedComponent {}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
export const routes: Routes = [
  // Default redirect
  {
    path: '',
    redirectTo: '/admin/users',
    pathMatch: 'full',
  },

  // Auth area — public, no guards
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password.component').then(
            m => m.ForgotPasswordComponent,
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password.component').then(
            m => m.ResetPasswordComponent,
          ),
      },
    ],
  },

  // Admin area — layout shell + per-route roleGuard
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'users',
        pathMatch: 'full',
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/users/users.component').then(m => m.UsersComponent),
        canActivate: [roleGuard],
        data: { requiredRoles: ['Admin', 'Auditor'] },
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('./features/admin/roles/roles.component').then(m => m.RolesComponent),
        canActivate: [roleGuard],
        data: { requiredRoles: ['Admin'] },
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./features/admin/audit/audit.component').then(m => m.AuditComponent),
        canActivate: [roleGuard],
        data: { requiredRoles: ['Admin', 'Auditor'] },
      },
    ],
  },

  // Inline — no lazy load needed
  {
    path: 'unauthorized',
    component: UnauthorizedComponent,
  },

  // Catch-all
  {
    path: '**',
    redirectTo: '/auth/login',
  },
];
