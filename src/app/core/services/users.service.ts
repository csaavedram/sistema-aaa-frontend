import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, AppError } from '../models/auth.models';
import { CreateUserRequest, UpdateUserRequest, User, UserListResponse } from '../models/users.models';
import { Permission } from '../models/roles.models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  readonly #apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getUsers(page: number, pageSize: number): Observable<ApiResponse<UserListResponse>> {
    return this.http
      .get<ApiResponse<UserListResponse>>(`${this.#apiUrl}/api/v1/users`, {
        params: { page, pageSize },
      })
      .pipe(catchError(this.#handleError));
  }

  getUserById(id: string): Observable<ApiResponse<User>> {
    return this.http
      .get<ApiResponse<User>>(`${this.#apiUrl}/api/v1/users/${id}`)
      .pipe(catchError(this.#handleError));
  }

  createUser(request: CreateUserRequest): Observable<ApiResponse<{ userId: string }>> {
    return this.http
      .post<ApiResponse<{ userId: string }>>(`${this.#apiUrl}/api/v1/users`, request)
      .pipe(catchError(this.#handleError));
  }

  updateUser(id: string, request: UpdateUserRequest): Observable<ApiResponse<boolean>> {
    return this.http
      .put<ApiResponse<boolean>>(`${this.#apiUrl}/api/v1/users/${id}`, request)
      .pipe(catchError(this.#handleError));
  }

  deleteUser(id: string): Observable<ApiResponse<boolean>> {
    return this.http
      .delete<ApiResponse<boolean>>(`${this.#apiUrl}/api/v1/users/${id}`)
      .pipe(catchError(this.#handleError));
  }

  getUserPermissions(userId: string): Observable<ApiResponse<Permission[]>> {
    return this.http
      .get<ApiResponse<Permission[]>>(`${this.#apiUrl}/api/v1/users/${userId}/permissions`)
      .pipe(catchError(this.#handleError));
  }

  readonly #handleError = (error: HttpErrorResponse): Observable<never> => {
    const appError: AppError = {
      errorCode: error.error?.errorCode ?? 'UNKNOWN_ERROR',
      message: error.error?.message ?? 'Error desconocido',
    };
    return throwError(() => appError);
  };
}
