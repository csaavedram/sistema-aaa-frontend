import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, finalize, tap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuditService } from '../../../core/services/audit.service';
import { UsersService } from '../../../core/services/users.service';
import { AuditLog, AuditLogFilter } from '../../../core/models/audit.models';
import { AppError } from '../../../core/models/auth.models';
import { User } from '../../../core/models/users.models';

// ---------------------------------------------------------------------------
// Inline dialog — user preview (read-only)
// ---------------------------------------------------------------------------
@Component({
  selector: 'app-user-preview-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Detalle del usuario</h2>
    <mat-dialog-content class="detail-content">

      @if (isLoading()) {
        <div class="detail-spinner">
          <mat-spinner diameter="48" />
        </div>
      } @else if (user()) {

        <div class="detail-row">
          <span class="detail-label">Email</span>
          <span>{{ user()!.email }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Estado</span>
          <span class="status-chip" [class.active]="user()!.isActive"
            [class.inactive]="!user()!.isActive">
            {{ user()!.isActive ? 'Activo' : 'Inactivo' }}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Creado</span>
          <span>{{ user()!.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
        </div>

      } @else {
        <p class="empty-hint">Usuario no encontrado (puede haber sido eliminado)</p>
      }

    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close aria-label="Cerrar detalle del usuario">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .detail-content { min-width: 360px; padding-top: 8px; }
    .detail-spinner { display: flex; justify-content: center; padding: 40px 0; }
    .detail-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 14px; }
    .detail-label { min-width: 80px; color: #78909c; font-size: 13px; flex-shrink: 0; }
    .status-chip { display: inline-block; padding: 2px 10px; border-radius: 12px;
      font-size: 12px; font-weight: 500; }
    .status-chip.active { background: #e8f5e9; color: #2e7d32; }
    .status-chip.inactive { background: #fce4ec; color: #c62828; }
    .empty-hint { font-size: 13px; color: #9e9e9e; font-style: italic; }
  `],
})
export class UserPreviewDialogComponent implements OnInit {
  readonly data = inject<{ userId: string }>(MAT_DIALOG_DATA);
  readonly isLoading = signal(true);
  readonly user = signal<User | null>(null);

  readonly #usersService = inject(UsersService);
  readonly #destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.#usersService
      .getUserById(this.data.userId)
      .pipe(
        tap(response => this.user.set(response.data ?? null)),
        catchError(() => EMPTY),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }
}

// ---------------------------------------------------------------------------
// Inline dialog — audit log detail
// ---------------------------------------------------------------------------
@Component({
  selector: 'app-audit-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Detalle del log</h2>
    <mat-dialog-content class="detail-content">

      @if (isLoading()) {
        <div class="detail-spinner">
          <mat-spinner diameter="48" />
        </div>
      } @else if (log()) {

        <div class="detail-row">
          <span class="detail-label">Evento</span>
          <code class="event-code">{{ log()!.eventType }}</code>
        </div>
        <div class="detail-row">
          <span class="detail-label">Recurso</span>
          <span>{{ log()!.resource }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Usuario</span>
          <span>{{ log()!.userId ?? '—' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">IP</span>
          <span>{{ log()!.ipAddress ?? '—' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Fecha</span>
          <span>{{ log()!.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</span>
        </div>

        @if (log()!.details) {
          <mat-divider class="detail-divider" />
          <div class="detail-section">
            <span class="detail-label">Detalles</span>
            <pre class="json-pre">{{ formatDetails(log()!.details) }}</pre>
          </div>
        }

      } @else {
        <p class="empty-hint">No se pudo cargar el detalle</p>
      }

    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close aria-label="Cerrar detalle del log">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .detail-content { min-width: 440px; padding-top: 8px; }
    .detail-spinner { display: flex; justify-content: center; padding: 40px 0; }
    .detail-row { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; font-size: 14px; }
    .detail-label { min-width: 90px; color: #78909c; font-size: 13px; flex-shrink: 0; }
    .event-code { font-family: monospace; font-size: 12px; background: #f5f5f5;
      padding: 2px 6px; border-radius: 3px; color: #37474f; }
    .detail-divider { margin: 12px 0; }
    .detail-section { display: flex; flex-direction: column; gap: 6px; padding: 6px 0; }
    .json-pre { font-family: monospace; font-size: 12px; background: #f5f5f5;
      padding: 10px 12px; border-radius: 4px; overflow-x: auto; margin: 0;
      color: #37474f; max-height: 200px; white-space: pre-wrap; word-break: break-all; }
    .empty-hint { font-size: 13px; color: #9e9e9e; font-style: italic; }
  `],
})
export class AuditDetailDialogComponent implements OnInit {
  readonly data = inject<{ logId: string }>(MAT_DIALOG_DATA);
  readonly isLoading = signal(true);
  readonly log = signal<AuditLog | null>(null);

  readonly #auditService = inject(AuditService);
  readonly #destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.#auditService
      .getAuditLogById(this.data.logId)
      .pipe(
        tap(response => this.log.set(response.data ?? null)),
        catchError(() => EMPTY),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  formatDetails(details: string | null): string {
    if (!details) return '—';
    try {
      return JSON.stringify(JSON.parse(details), null, 2);
    } catch {
      return details;
    }
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
@Component({
  selector: 'app-audit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.scss',
})
export class AuditComponent implements OnInit {
  readonly logs = signal<AuditLog[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly totalItems = signal(0);
  readonly filter = signal<Partial<AuditLogFilter>>({ page: 1, pageSize: 50 });

  readonly displayedColumns = ['eventType', 'resource', 'userId', 'ipAddress', 'createdAt', 'actions'];

  readonly filterForm = inject(FormBuilder).group({
    eventType: [''],
    userId: [''],
    from: [null as Date | null],
    to: [null as Date | null],
  });

  readonly #auditService = inject(AuditService);
  readonly #usersService = inject(UsersService);
  readonly #dialog = inject(MatDialog);
  readonly #snackBar = inject(MatSnackBar);
  readonly #destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading.set(true);

    const current = this.filter();
    const fullFilter: AuditLogFilter = {
      page: current.page ?? 1,
      pageSize: current.pageSize ?? 50,
      ...(current.eventType && { eventType: current.eventType }),
      ...(current.userId && { userId: current.userId }),
      ...(current.from && { from: current.from }),
      ...(current.to && { to: current.to }),
    };

    this.#auditService
      .getAuditLogs(fullFilter)
      .pipe(
        tap(response => {
          this.logs.set(response.data!.logs);
          this.totalItems.set(response.data!.totalItems ?? response.data!.logs.length);
        }),
        catchError((err: AppError) => {
          this.logs.set([]);
          this.error.set(err.message);
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  onSearch(): void {
    const { eventType, userId, from, to } = this.filterForm.getRawValue();
    const fromStr = from ? from.toISOString() : undefined;
    const toStr = to ? to.toISOString() : undefined;
    this.filter.set({
      page: 1,
      pageSize: this.filter().pageSize ?? 50,
      ...(eventType?.trim() && { eventType: eventType.trim() }),
      ...(userId?.trim() && { userId: userId.trim() }),
      ...(fromStr && { from: fromStr }),
      ...(toStr && { to: toStr }),
    });
    this.loadLogs();
  }

  onPageChange(event: PageEvent): void {
    this.filter.update(f => ({
      ...f,
      page: event.pageIndex + 1,
      pageSize: event.pageSize,
    }));
    this.loadLogs();
  }

  onClearFilters(): void {
    this.filterForm.reset();
    this.filter.set({ page: 1, pageSize: 50 });
    this.loadLogs();
  }

  onViewAuditDetail(log: AuditLog): void {
    this.#dialog.open(AuditDetailDialogComponent, {
      width: '520px',
      data: { logId: log.id },
    });
  }

  onViewUser(userId: string): void {
    this.#dialog.open(UserPreviewDialogComponent, {
      width: '420px',
      data: { userId },
    });
  }

  onCopyLogId(id: string): void {
    navigator.clipboard.writeText(id).then(() =>
      this.#snackBar.open('ID copiado', 'OK', { duration: 2000 })
    );
  }
}
