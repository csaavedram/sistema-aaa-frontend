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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, finalize, forkJoin, switchMap, tap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { RolesService } from '../../../core/services/roles.service';
import { CreateUserRequest, UpdateUserRequest, User } from '../../../core/models/users.models';
import { Permission, Role } from '../../../core/models/roles.models';
import { AppError } from '../../../core/models/auth.models';

// ---------------------------------------------------------------------------
// Inline dialog — create user
// ---------------------------------------------------------------------------
@Component({
  selector: 'app-create-user-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Nuevo usuario</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="email" />
          @if (form.controls.email.hasError('required') && form.controls.email.touched) {
            <mat-error>El email es requerido</mat-error>
          } @else if (form.controls.email.hasError('email') && form.controls.email.touched) {
            <mat-error>Email inválido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Contraseña</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="new-password" />
          @if (form.controls.password.hasError('required') && form.controls.password.touched) {
            <mat-error>La contraseña es requerida</mat-error>
          } @else if (form.controls.password.hasError('minlength') && form.controls.password.touched) {
            <mat-error>Mínimo 8 caracteres</mat-error>
          } @else if (form.controls.password.hasError('pattern') && form.controls.password.touched) {
            <mat-error>Debe incluir al menos una mayúscula, un número y un símbolo</mat-error>
          }
          @if (form.controls.password.dirty) {
            <mat-hint>Mín. 8 car., mayúscula, número y símbolo</mat-hint>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Rol</mat-label>
          <mat-select formControlName="roleId" placeholder="Selecciona un rol">
            @if (isRolesLoading()) {
              <mat-option disabled>Cargando roles...</mat-option>
            } @else {
              @for (role of roles(); track role.id) {
                <mat-option [value]="role.id">{{ role.name }}</mat-option>
              }
            }
          </mat-select>
          @if (form.controls.roleId.hasError('required') && form.controls.roleId.touched) {
            <mat-error>El rol es requerido</mat-error>
          }
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
    .dialog-form { display: flex; flex-direction: column; gap: 4px; padding-top: 8px; min-width: 360px; }
    .full-width { width: 100%; }
  `],
})
export class CreateUserDialogComponent implements OnInit {
  readonly roles = signal<Role[]>([]);
  readonly isRolesLoading = signal(false);

  readonly form = inject(FormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern('^(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).{8,}$'),
    ]],
    roleId: ['', Validators.required],
  });

  readonly #rolesService = inject(RolesService);
  readonly #destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.isRolesLoading.set(true);
    this.#rolesService
      .getRoles()
      .pipe(
        tap(response => this.roles.set(response.data ?? [])),
        catchError(() => {
          this.roles.set([]);
          return EMPTY;
        }),
        finalize(() => this.isRolesLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }
}

// ---------------------------------------------------------------------------
// Inline dialog — user detail
// ---------------------------------------------------------------------------
@Component({
  selector: 'app-user-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatIconModule,
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

        <section class="detail-section">
          <h3 class="section-title">Información básica</h3>
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
          <div class="detail-row">
            <span class="detail-label">Actualizado</span>
            <span>{{ user()!.updatedAt | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>
        </section>

        <mat-divider />

        <section class="detail-section">
          <h3 class="section-title">Roles asignados</h3>
          @if (roles().length === 0) {
            <p class="empty-hint">Sin roles asignados</p>
          } @else {
            <div class="chip-list">
              @for (role of roles(); track role.id) {
                <span class="role-chip">
                  {{ role.name }}
                  <button mat-icon-button class="chip-remove"
                    (click)="removeRole(role.id)"
                    [attr.aria-label]="'Quitar rol ' + role.name"
                    tabindex="-1">
                    <mat-icon>close</mat-icon>
                  </button>
                </span>
              }
            </div>
          }
        </section>

        <mat-divider />

        <section class="detail-section">
          <h3 class="section-title">Permisos efectivos</h3>
          @if (permissions().length === 0) {
            <p class="empty-hint">Sin permisos asignados</p>
          } @else {
            <div class="perm-list">
              @for (perm of permissions(); track perm.id) {
                <code class="perm-item">{{ (perm.resource + '.' + perm.action).toLowerCase() }}</code>
              }
            </div>
          }
        </section>

      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close aria-label="Cerrar detalle">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .detail-content { min-width: 420px; padding-top: 4px; }
    .detail-spinner { display: flex; justify-content: center; padding: 40px 0; }
    .detail-section { padding: 16px 0 8px; }
    .section-title { font-size: 13px; font-weight: 600; color: #546e7a;
      text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px; }
    .detail-row { display: flex; align-items: center; gap: 8px;
      padding: 4px 0; font-size: 14px; }
    .detail-label { min-width: 100px; color: #78909c; font-size: 13px; }
    .status-chip { display: inline-block; padding: 2px 10px; border-radius: 12px;
      font-size: 12px; font-weight: 500; }
    .status-chip.active { background: #e8f5e9; color: #2e7d32; }
    .status-chip.inactive { background: #fce4ec; color: #c62828; }
    .chip-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .role-chip { display: inline-flex; align-items: center; gap: 0;
      background: #e3f2fd; color: #1565c0; border-radius: 16px;
      padding: 2px 2px 2px 12px; font-size: 13px; font-weight: 500;
      line-height: 1; }
    .chip-remove {
      width: 24px !important; height: 24px !important;
      line-height: 24px !important; padding: 0 !important;
      display: inline-flex !important; align-items: center !important;
      justify-content: center !important;
      ::ng-deep .mat-icon { font-size: 16px; width: 16px; height: 16px; line-height: 16px; } }
    .perm-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .perm-item { font-family: monospace; font-size: 12px; background: #f5f5f5;
      padding: 2px 8px; border-radius: 3px; color: #37474f; }
    .empty-hint { font-size: 13px; color: #9e9e9e; font-style: italic; margin: 4px 0 0; }
  `],
})
export class UserDetailDialogComponent implements OnInit {
  readonly data = inject<{ userId: string }>(MAT_DIALOG_DATA);
  readonly isLoading = signal(true);
  readonly user = signal<User | null>(null);
  readonly roles = signal<Role[]>([]);
  readonly permissions = signal<Permission[]>([]);

  readonly #usersService = inject(UsersService);
  readonly #rolesService = inject(RolesService);
  readonly #destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    forkJoin({
      user: this.#usersService.getUserById(this.data.userId),
      roles: this.#rolesService.getUserRoles(this.data.userId),
      permissions: this.#usersService.getUserPermissions(this.data.userId),
    }).pipe(
      tap(results => {
        this.user.set(results.user.data ?? null);
        this.roles.set(results.roles.data ?? []);
        this.permissions.set(results.permissions.data ?? []);
      }),
      catchError(() => EMPTY),
      finalize(() => this.isLoading.set(false)),
      takeUntilDestroyed(this.#destroyRef),
    ).subscribe();
  }

  removeRole(roleId: string): void {
    this.#rolesService
      .removeRoleFromUser(roleId, this.data.userId)
      .pipe(
        switchMap(() => this.#rolesService.getUserRoles(this.data.userId)),
        tap(response => this.roles.set(response.data ?? [])),
        catchError(() => EMPTY),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }
}

// ---------------------------------------------------------------------------
// Inline dialog — edit user
// ---------------------------------------------------------------------------
@Component({
  selector: 'app-edit-user-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Editar usuario</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="email" />
          @if (form.controls.email.hasError('required') && form.controls.email.touched) {
            <mat-error>El email es requerido</mat-error>
          } @else if (form.controls.email.hasError('email') && form.controls.email.touched) {
            <mat-error>Email inválido</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancelar</button>
      <button mat-raised-button color="primary"
        [mat-dialog-close]="form.getRawValue()"
        [disabled]="form.invalid">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; padding-top: 8px; min-width: 340px; }
    .full-width { width: 100%; }
  `],
})
export class EditUserDialogComponent {
  readonly #data = inject<{ userId: string; email: string }>(MAT_DIALOG_DATA);
  readonly form = inject(FormBuilder).group({
    email: [this.#data.email, [Validators.required, Validators.email]],
  });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
@Component({
  selector: 'app-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  readonly users = signal<User[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly totalItems = signal(0);
  readonly currentPage = signal(1);
  readonly pageSize = signal(20);

  readonly displayedColumns = ['id', 'email', 'isActive', 'createdAt', 'actions'];

  readonly #authService = inject(AuthService);
  readonly #usersService = inject(UsersService);
  readonly #rolesService = inject(RolesService);
  readonly #dialog = inject(MatDialog);
  readonly #snackBar = inject(MatSnackBar);
  readonly #destroyRef = inject(DestroyRef);

  readonly isAdmin = computed(() => this.#authService.userRoles().includes('Admin'));

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.#usersService
      .getUsers(this.currentPage(), this.pageSize())
      .pipe(
        tap(response => {
          this.users.set(response.data!.users);
          this.totalItems.set(response.data!.totalItems ?? response.data!.users.length);
        }),
        catchError((err: AppError) => {
          this.error.set(err.message);
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.loadUsers();
  }

  openCreateDialog(): void {
    this.#dialog
      .open(CreateUserDialogComponent, { width: '480px', disableClose: true })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: { email: string; password: string; roleId: string } | null) => {
        if (!result) return;
        this.#usersService
          .createUser({ email: result.email, password: result.password })
          .pipe(
            switchMap(response =>
              this.#rolesService.assignRoleToUser(result.roleId, response.data!.userId),
            ),
            tap(() => this.loadUsers()),
            catchError((err: AppError) => {
              this.error.set(err.message);
              return EMPTY;
            }),
            takeUntilDestroyed(this.#destroyRef),
          )
          .subscribe();
      });
  }

  onViewDetail(user: User): void {
    this.#dialog.open(UserDetailDialogComponent, {
      width: '520px',
      data: { userId: user.id },
    });
  }

  onEditUser(user: User): void {
    this.#dialog
      .open(EditUserDialogComponent, {
        width: '440px',
        disableClose: true,
        data: { userId: user.id, email: user.email },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: Pick<UpdateUserRequest, 'email'> | null) => {
        if (!result) return;
        this.#usersService
          .updateUser(user.id, { email: result.email })
          .pipe(
            tap(() => this.loadUsers()),
            catchError((err: AppError) => {
              this.error.set(err.message);
              return EMPTY;
            }),
            takeUntilDestroyed(this.#destroyRef),
          )
          .subscribe();
      });
  }

  onCopyId(id: string): void {
    navigator.clipboard.writeText(id).then(() => {
      this.#snackBar.open('ID copiado al portapapeles', 'OK', { duration: 2000 });
    });
  }

  onDeleteUser(id: string): void {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

    this.#usersService
      .deleteUser(id)
      .pipe(
        tap(() => this.loadUsers()),
        catchError((err: AppError) => {
          this.error.set(err.message);
          return EMPTY;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }
}