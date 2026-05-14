import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, AppError } from '../models/auth.models';
import {
  AssignPermissionsRequest,
  CreateRoleRequest,
  Permission,
  Role,
} from '../models/roles.models';

@Injectable({ providedIn: 'root' })
export class RolesService {
  readonly #apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getRoles(): Observable<ApiResponse<Role[]>> {
    return this.http
      .get<ApiResponse<Role[]>>(`${this.#apiUrl}/api/v1/roles`)
      .pipe(catchError(this.#handleError));
  }

  getRoleById(id: string): Observable<ApiResponse<Role>> {
    return this.http
      .get<ApiResponse<Role>>(`${this.#apiUrl}/api/v1/roles/${id}`)
      .pipe(catchError(this.#handleError));
  }

  createRole(request: CreateRoleRequest): Observable<ApiResponse<Role>> {
    return this.http
      .post<ApiResponse<Role>>(`${this.#apiUrl}/api/v1/roles`, request)
      .pipe(catchError(this.#handleError));
  }

  deleteRole(id: string): Observable<ApiResponse<boolean>> {
    return this.http
      .delete<ApiResponse<boolean>>(`${this.#apiUrl}/api/v1/roles/${id}`)
      .pipe(catchError(this.#handleError));
  }

  getRolePermissions(id: string): Observable<ApiResponse<Permission[]>> {
    return this.http
      .get<ApiResponse<Permission[]>>(`${this.#apiUrl}/api/v1/roles/${id}/permissions`)
      .pipe(catchError(this.#handleError));
  }

  assignPermissions(id: string, request: AssignPermissionsRequest): Observable<ApiResponse<boolean>> {
    return this.http
      .post<ApiResponse<boolean>>(`${this.#apiUrl}/api/v1/roles/${id}/permissions`, request)
      .pipe(catchError(this.#handleError));
  }

  assignRoleToUser(roleId: string, userId: string): Observable<ApiResponse<boolean>> {
    return this.http
      .post<ApiResponse<boolean>>(`${this.#apiUrl}/api/v1/roles/${roleId}/users/${userId}`, null)
      .pipe(catchError(this.#handleError));
  }

  removeRoleFromUser(roleId: string, userId: string): Observable<ApiResponse<boolean>> {
    return this.http
      .delete<ApiResponse<boolean>>(`${this.#apiUrl}/api/v1/roles/${roleId}/users/${userId}`)
      .pipe(catchError(this.#handleError));
  }

  getUserRoles(userId: string): Observable<ApiResponse<Role[]>> {
    return this.http
      .get<ApiResponse<Role[]>>(`${this.#apiUrl}/api/v1/roles/users/${userId}`)
      .pipe(catchError(this.#handleError));
  }

  getAllPermissions(userId: string): Observable<ApiResponse<Permission[]>> {
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
