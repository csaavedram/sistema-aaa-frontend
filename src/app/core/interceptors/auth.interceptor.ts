import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

// Endpoints that must never trigger a token-refresh retry on 401
const NO_RETRY_PATHS = ['/api/v1/auth/refresh', '/api/v1/auth/login'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isApiRequest = req.url.startsWith(environment.apiUrl);

  // Attach Bearer token only to requests targeting our own API
  const token = authService.getAccessToken();
  const authReq = isApiRequest && token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError(error => {
      const is401 = error instanceof HttpErrorResponse && error.status === 401;
      const isNoRetry = NO_RETRY_PATHS.some(path => req.url.includes(path));

      if (is401 && isApiRequest && !isNoRetry) {
        // Attempt a single token refresh, then retry the original request
        return authService.refreshToken().pipe(
          switchMap(() => {
            const newToken = authService.getAccessToken();
            const retryReq = newToken
              ? req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })
              : req;
            return next(retryReq);
          }),
          catchError(refreshError => {
            // Refresh failed or retry still returned 401 — force logout
            authService.logout().subscribe({ error: () => {} });
            router.navigate(['/auth/login']);
            return throwError(() => refreshError);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
