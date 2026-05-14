import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, finalize, forkJoin, switchMap, tap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/services/auth.service';
import { RolesService } from '../../../core/services/roles.service';
import { CreateRoleRequest, Permission, Role } from '../../../core/models/roles.models';
import { AppError } from '../../../core/models/auth.models';

// ---------------------------------------------------------------------------
// Inline dialog — create role
// ---------------------------------------------------------------------------
@Component({
  selector: 'app-create-role-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Nuevo rol</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" />
          @if (form.controls.name.hasError('required') && form.controls.name.touched) {
            <mat-error>El nombre es requerido</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancelar</button>
      <button mat-raised-button color="primary"
        [mat-dialog-close]="form.getRawValue()"
        [disabled]="form.invalid">
        Crear
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; padding-top: 8px; min-width: 340px; }
    .full-width { width: 100%; }
  `],
})
export class CreateRoleDialogComponent {
  readonly form = inject(FormBuilder).group({
    name: ['', Validators.required],
    description: [''],
  });
}

// ---------------------------------------------------------------------------
// Inline dialog — role detail with permission management
// ---------------------------------------------------------------------------
@Component({
  selector: 'app-role-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
  ],
  template: `
    <h2 mat-dialog-title>Gestionar rol — {{ data.roleName }}</h2>
    <mat-dialog-content class="detail-content">

      @if (isLoading()) {
        <div class="detail-spinner">
          <mat-spinner diameter="48" />
        </div>
      } @else if (role()) {

        <section class="detail-section">
          <h3 class="section-title">Información del rol</h3>
          <div class="detail-row">
            <span class="detail-label">Nombre</span>
            <span>{{ role()!.name }}</span>
          </div>
          @if (role()!.description) {
            <div class="detail-row">
              <span class="detail-label">Descripción</span>
              <span>{{ role()!.description }}</span>
            </div>
          }
          <div class="detail-row">
            <span class="detail-label">Tipo</span>
            <span class="type-chip" [class.system]="role()!.isSystem"
              [class.custom]="!role()!.isSystem">
              {{ role()!.isSystem ? 'Sistema' : 'Personalizado' }}
            </span>
          </div>
        </section>

        <mat-divider />

        <section class="detail-section">
          <h3 class="section-title">Permisos asignados</h3>
          @if (permissions().length === 0) {
            <p class="empty-hint">Sin permisos asignados</p>
          } @else {
            <table mat-table [dataSource]="permissions()" class="perm-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Permiso</th>
                <td mat-cell *matCellDef="let p">{{ p.name }}</td>
              </ng-container>
              <ng-container matColumnDef="resource">
                <th mat-header-cell *matHeaderCellDef>Recurso</th>
                <td mat-cell *matCellDef="let p">{{ p.resource }}</td>
              </ng-container>
              <ng-container matColumnDef="action">
                <th mat-header-cell *matHeaderCellDef>Acción</th>
                <td mat-cell *matCellDef="let p">{{ p.action }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols;"></tr>
            </table>
          }
        </section>

        @if (!role()!.isSystem) {
          <mat-divider />
          <section class="detail-section">
            <h3 class="section-title">Agregar permisos</h3>
            @if (availablePermissions().length === 0) {
              <p class="empty-hint">Todos los permisos ya están asignados</p>
            } @else {
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Seleccionar permisos</mat-label>
                <mat-select multiple [formControl]="permissionSelectControl">
                  @for (p of availablePermissions(); track p.id) {
                    <mat-option [value]="p.id">{{ p.resource }}.{{ p.action }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              @if (assignError()) {
                <div class="assign-error" role="alert">{{ assignError() }}</div>
              }
              <div class="assign-actions">
                <button mat-raised-button color="primary"
                  [disabled]="permissionSelectControl.value.length === 0 || isAssigning()"
                  (click)="onAssignPermission()"
                  aria-label="Agregar permisos al rol">
                  @if (isAssigning()) {
                    <mat-spinner diameter="16" class="btn-spinner" />
                  }
                  <span>Agregar</span>
                </button>
              </div>
            }
          </section>
        }

      }

    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close aria-label="Cerrar gestión del rol">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .detail-content { min-width: 480px; padding-top: 4px; }
    .detail-spinner { display: flex; justify-content: center; padding: 40px 0; }
    .detail-section { padding: 16px 0 8px; }
    .section-title { font-size: 13px; font-weight: 600; color: #546e7a;
      text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px; }
    .detail-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 14px; }
    .detail-label { min-width: 100px; color: #78909c; font-size: 13px; }
    .type-chip { display: inline-block; padding: 2px 10px; border-radius: 12px;
      font-size: 12px; font-weight: 500; }
    .type-chip.system { background: #e3f2fd; color: #1565c0; }
    .type-chip.custom { background: #f3e5f5; color: #6a1b9a; }
    .perm-table { width: 100%; }
    .empty-hint { font-size: 13px; color: #9e9e9e; font-style: italic; margin: 4px 0 0; }
    .full-width { width: 100%; }
    .assign-actions { display: flex; justify-content: flex-end; margin-top: 4px; }
    .assign-error { background: #fdecea; color: #c62828; border-radius: 4px;
      padding: 8px 12px; font-size: 13px; margin-bottom: 8px; }
    .btn-spinner { display: inline-block; margin-right: 4px;
      ::ng-deep circle { stroke: #fff; } }
  `],
})
export class RoleDetailDialogComponent implements OnInit {
  readonly data = inject<{ roleId: string; roleName: string }>(MAT_DIALOG_DATA);
  readonly isLoading = signal(true);
  readonly role = signal<Role | null>(null);
  readonly permissions = signal<Permission[]>([]);
  readonly allPermissions = signal<Permission[]>([]);
  readonly isAssigning = signal(false);
  readonly assignError = signal<string | null>(null);
  readonly cols = ['name', 'resource', 'action'];

  readonly permissionSelectControl = new FormControl<string[]>([], { nonNullable: true });

  readonly availablePermissions = computed(() =>
    this.allPermissions().filter(
      p => !this.permissions().some(assigned => assigned.id === p.id)
    )
  );

  readonly #rolesService = inject(RolesService);
  readonly #authService = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    const userId = this.#authService.currentUser()?.userId ?? '';
    forkJoin({
      role: this.#rolesService.getRoleById(this.data.roleId),
      permissions: this.#rolesService.getRolePermissions(this.data.roleId),
      allPerms: this.#rolesService.getAllPermissions(userId),
    }).pipe(
      tap(results => {
        this.role.set(results.role.data ?? null);
        this.permissions.set(results.permissions.data ?? []);
        this.allPermissions.set(results.allPerms.data ?? []);
      }),
      catchError(() => EMPTY),
      finalize(() => this.isLoading.set(false)),
      takeUntilDestroyed(this.#destroyRef),
    ).subscribe();
  }

  onAssignPermission(): void {
    const selected = this.permissionSelectControl.value;
    if (selected.length === 0) return;
    this.isAssigning.set(true);
    this.assignError.set(null);

    this.#rolesService
      .assignPermissions(this.data.roleId, { permissionIds: selected })
      .pipe(
        switchMap(() => this.#rolesService.getRolePermissions(this.data.roleId)),
        tap(response => {
          this.permissions.set(response.data ?? []);
          this.permissionSelectControl.reset([]);
        }),
        catchError((err: AppError) => {
          this.assignError.set(err.message);
          return EMPTY;
        }),
        finalize(() => this.isAssigning.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }
}

// ---------------------------------------------------------------------------
// Inline dialog — view role permissions (read-only)
// ---------------------------------------------------------------------------
@Component({
  selector: 'app-view-role-permissions-dialog',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  template: `
    <h2 mat-dialog-title>Permisos — {{ data.roleName }}</h2>
    <mat-dialog-content>
      @if (isLoading()) {
        <div class="dialog-spinner">
          <mat-spinner diameter="36" />
        </div>
      } @else {
        <table mat-table [dataSource]="permissions()" class="perm-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Permiso</th>
            <td mat-cell *matCellDef="let p">{{ p.name }}</td>
          </ng-container>
          <ng-container matColumnDef="resource">
            <th mat-header-cell *matHeaderCellDef>Recurso</th>
            <td mat-cell *matCellDef="let p">{{ p.resource }}</td>
          </ng-container>
          <ng-container matColumnDef="action">
            <th mat-header-cell *matHeaderCellDef>Acción</th>
            <td mat-cell *matCellDef="let p">{{ p.action }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell" colspan="3"
              style="text-align:center;padding:24px;color:#9e9e9e;">
              Sin permisos asignados
            </td>
          </tr>
        </table>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-spinner { display: flex; justify-content: center; padding: 32px; }
    .perm-table { width: 100%; min-width: 420px; }
  `],
})
export class ViewRolePermissionsDialogComponent implements OnInit {
  readonly data = inject<{ roleId: string; roleName: string }>(MAT_DIALOG_DATA);
  readonly permissions = signal<Permission[]>([]);
  readonly isLoading = signal(false);
  readonly cols = ['name', 'resource', 'action'];

  readonly #rolesService = inject(RolesService);
  readonly #destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.isLoading.set(true);
    this.#rolesService
      .getRolePermissions(this.data.roleId)
      .pipe(
        tap(response => this.permissions.set(response.data ?? [])),
        catchError(() => {
          this.permissions.set([]);
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }
}

// ---------------------------------------------------------------------------
// Inline dialog — assign role to user (includes remove section)
// ---------------------------------------------------------------------------
@Component({
  selector: 'app-assign-role-to-user-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Gestionar usuarios — rol "{{ data.roleName }}"</h2>
    <mat-dialog-content>

      <form [formGroup]="form" class="dialog-form">
        <p class="section-label">Asignar a usuario</p>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>ID de usuario</mat-label>
          <input matInput formControlName="userId"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          @if (form.controls.userId.hasError('required') && form.controls.userId.touched) {
            <mat-error>El ID de usuario es requerido</mat-error>
          }
        </mat-form-field>
      </form>

      <mat-divider class="section-divider" />

      <form [formGroup]="removeForm" (ngSubmit)="onRemoveUser()" class="dialog-form">
        <p class="section-label">Quitar rol de usuario</p>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>ID de usuario</mat-label>
          <input matInput formControlName="userId"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          @if (removeForm.controls.userId.hasError('required')
            && removeForm.controls.userId.touched) {
            <mat-error>El ID de usuario es requerido</mat-error>
          }
        </mat-form-field>
        @if (removeError()) {
          <div class="remove-error" role="alert">{{ removeError() }}</div>
        }
        <div class="remove-actions">
          <button mat-stroked-button color="warn" type="submit"
            [disabled]="removeForm.invalid || isRemoving()"
            aria-label="Quitar rol del usuario">
            @if (isRemoving()) {
              <mat-spinner diameter="16" class="btn-spinner" />
            }
            <span>Quitar rol</span>
          </button>
        </div>
      </form>

    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancelar</button>
      <button mat-raised-button color="primary"
        [mat-dialog-close]="form.getRawValue()"
        [disabled]="form.invalid">
        Asignar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; padding-top: 8px; min-width: 380px; }
    .full-width { width: 100%; }
    .section-label { font-size: 13px; font-weight: 600; color: #546e7a; margin: 12px 0 4px; }
    .section-divider { margin: 8px 0; }
    .remove-error { background: #fdecea; color: #c62828; border-radius: 4px;
      padding: 8px 12px; font-size: 13px; margin-bottom: 8px; }
    .remove-actions { display: flex; justify-content: flex-end; }
    .btn-spinner { display: inline-block; margin-right: 4px;
      ::ng-deep circle { stroke: currentColor; } }
  `],
})
export class AssignRoleToUserDialogComponent {
  readonly data = inject<{ roleId: string; roleName: string }>(MAT_DIALOG_DATA);
  readonly isRemoving = signal(false);
  readonly removeError = signal<string | null>(null);

  readonly #fb = inject(FormBuilder);
  readonly form = this.#fb.group({
    userId: ['', Validators.required],
  });
  readonly removeForm = this.#fb.group({
    userId: ['', Validators.required],
  });

  readonly #rolesService = inject(RolesService);
  readonly #snackBar = inject(MatSnackBar);
  readonly #destroyRef = inject(DestroyRef);

  onRemoveUser(): void {
    if (this.removeForm.invalid) {
      this.removeForm.markAllAsTouched();
      return;
    }
    const { userId } = this.removeForm.getRawValue();
    this.isRemoving.set(true);
    this.removeError.set(null);

    this.#rolesService
      .removeRoleFromUser(this.data.roleId, userId!)
      .pipe(
        tap(() => {
          this.#snackBar.open('Rol removido del usuario', 'OK', { duration: 2000 });
          this.removeForm.reset();
        }),
        catchError((err: AppError) => {
          this.removeError.set(err.message);
          return EMPTY;
        }),
        finalize(() => this.isRemoving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
@Component({
  selector: 'app-roles',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.scss',
})
export class RolesComponent implements OnInit {
  readonly roles = signal<Role[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly displayedColumns = ['name', 'description', 'isSystem', 'actions'];

  readonly #rolesService = inject(RolesService);
  readonly #dialog = inject(MatDialog);
  readonly #destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.#rolesService
      .getRoles()
      .pipe(
        tap(response => this.roles.set(response.data ?? [])),
        catchError((err: AppError) => {
          this.error.set(err.message);
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  openCreateDialog(): void {
    this.#dialog
      .open(CreateRoleDialogComponent, { width: '440px', disableClose: true })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: CreateRoleRequest | null) => {
        if (!result) return;
        this.#rolesService
          .createRole(result)
          .pipe(
            tap(() => this.loadRoles()),
            catchError((err: AppError) => {
              this.error.set(err.message);
              return EMPTY;
            }),
            takeUntilDestroyed(this.#destroyRef),
          )
          .subscribe();
      });
  }

  onManageRole(role: Role): void {
    this.#dialog.open(RoleDetailDialogComponent, {
      width: '560px',
      data: { roleId: role.id, roleName: role.name },
    });
  }

  onViewPermissions(role: Role): void {
    this.#dialog.open(ViewRolePermissionsDialogComponent, {
      width: '560px',
      data: { roleId: role.id, roleName: role.name },
    });
  }

  onAssignToUser(role: Role): void {
    this.#dialog
      .open(AssignRoleToUserDialogComponent, {
        width: '460px',
        disableClose: true,
        data: { roleId: role.id, roleName: role.name },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: { userId: string } | null) => {
        if (!result) return;
        this.#rolesService
          .assignRoleToUser(role.id, result.userId)
          .pipe(
            tap(() => this.loadRoles()),
            catchError((err: AppError) => {
              this.error.set(err.message);
              return EMPTY;
            }),
            takeUntilDestroyed(this.#destroyRef),
          )
          .subscribe();
      });
  }

  onDeleteRole(id: string): void {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este rol?')) return;

    this.#rolesService
      .deleteRole(id)
      .pipe(
        tap(() => this.loadRoles()),
        catchError((err: AppError) => {
          this.error.set(err.message);
          return EMPTY;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }
}
