import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['requiredRoles'] as string[];
  const hasRole = requiredRoles.some(r => authService.userRoles().includes(r));

  return hasRole
    ? true
    : router.createUrlTree(['/unauthorized']);
};
