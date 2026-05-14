import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, AppError } from '../models/auth.models';
import { AuditLog, AuditLogFilter, AuditLogsResponse } from '../models/audit.models';

@Injectable({ providedIn: 'root' })
export class AuditService {
  readonly #apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getAuditLogs(filter: AuditLogFilter): Observable<ApiResponse<AuditLogsResponse>> {
    const params = this.#buildParams(filter);
    return this.http
      .get<ApiResponse<AuditLogsResponse>>(`${this.#apiUrl}/api/v1/audit`, { params })
      .pipe(catchError(this.#handleError));
  }

  getAuditLogById(id: string): Observable<ApiResponse<AuditLog>> {
    return this.http
      .get<ApiResponse<AuditLog>>(`${this.#apiUrl}/api/v1/audit/${id}`)
      .pipe(catchError(this.#handleError));
  }

  readonly #buildParams = (filter: AuditLogFilter): HttpParams =>
    Object.entries(filter)
      .filter(([, value]) => value !== undefined && value !== null)
      .reduce((params, [key, value]) => params.set(key, String(value)), new HttpParams());

  readonly #handleError = (error: HttpErrorResponse): Observable<never> => {
    const appError: AppError = {
      errorCode: error.error?.errorCode ?? 'UNKNOWN_ERROR',
      message: error.error?.message ?? 'Error desconocido',
    };
    return throwError(() => appError);
  };
}
