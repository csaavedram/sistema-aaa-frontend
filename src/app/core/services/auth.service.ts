import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  AppError,
  AuthResponse,
  ChangePasswordRequest,
  CurrentUser,
  ForgotPasswordRequest,
  LoginRequest,
  ResetPasswordRequest,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isAuthenticated = signal(false);
  readonly currentUser = signal<CurrentUser | null>(null);
  readonly userRoles = signal<string[]>([]);
  readonly userPermissions = signal<string[]>([]);

  #accessToken: string | null = null;

  readonly #apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  login(request: LoginRequest): Observable<void> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.#apiUrl}/api/v1/auth/login`, request)
      .pipe(
        tap(response => {
          const data = response.data!;
          this.#accessToken = data.accessToken;
          this.isAuthenticated.set(true);
          this.currentUser.set({
            userId: data.userId,
            email: request.email,
            roles: data.roles,
            permissions: [],
          });
          this.userRoles.set(data.roles);
        }),
        map(() => void 0),
        catchError(this.#handleError),
      );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.#apiUrl}/api/v1/auth/logout`, null, { withCredentials: true })
      .pipe(
        map(() => void 0),
        catchError(this.#handleError),
        finalize(() => {
          this.#accessToken = null;
          this.isAuthenticated.set(false);
          this.currentUser.set(null);
          this.userRoles.set([]);
          this.userPermissions.set([]);
        }),
      );
  }

  refreshToken(): Observable<void> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.#apiUrl}/api/v1/auth/refresh`, null, {
        withCredentials: true,
      })
      .pipe(
        tap(response => {
          this.#accessToken = response.data!.accessToken;
        }),
        map(() => void 0),
        catchError(this.#handleError),
      );
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<void> {
    return this.http
      .post<void>(`${this.#apiUrl}/api/v1/auth/forgot-password`, request)
      .pipe(map(() => void 0), catchError(this.#handleError));
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http
      .post<void>(`${this.#apiUrl}/api/v1/auth/reset-password`, request)
      .pipe(map(() => void 0), catchError(this.#handleError));
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http
      .post<void>(`${this.#apiUrl}/api/v1/auth/change-password`, request, {
        withCredentials: true,
      })
      .pipe(map(() => void 0), catchError(this.#handleError));
  }

  getAccessToken(): string | null {
    return this.#accessToken;
  }

  readonly #handleError = (error: HttpErrorResponse): Observable<never> => {
    const appError: AppError = {
      errorCode: error.error?.errorCode ?? 'UNKNOWN_ERROR',
      message: error.error?.message ?? 'Error desconocido',
    };
    return throwError(() => appError);
  };
}
