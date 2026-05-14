import {
  AbstractControl,
  ValidationErrors,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { EMPTY, catchError, finalize, tap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { AppError } from '../../core/models/auth.models';

// ---------------------------------------------------------------------------
// Validator — passwords must match
// ---------------------------------------------------------------------------
function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const np = control.get('newPassword')?.value as string | null;
  const cp = control.get('confirmPassword')?.value as string | null;
  return np === cp ? null : { passwordsMismatch: true };
}

// ---------------------------------------------------------------------------
// Inline dialog — change password
// ---------------------------------------------------------------------------
@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Cambiar contraseña</h2>
    <mat-dialog-content>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="dialog-form" id="change-pwd-form">

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Contraseña actual</mat-label>
          <input matInput [type]="hideCurrentPassword() ? 'password' : 'text'"
            formControlName="currentPassword" autocomplete="current-password" />
          <button mat-icon-button matSuffix type="button"
            (click)="hideCurrentPassword.set(!hideCurrentPassword())"
            [attr.aria-label]="hideCurrentPassword() ? 'Mostrar contraseña actual' : 'Ocultar contraseña actual'">
            <mat-icon>{{ hideCurrentPassword() ? 'visibility' : 'visibility_off' }}</mat-icon>
          </button>
          @if (form.controls.currentPassword.hasError('required') && form.controls.currentPassword.touched) {
            <mat-error>La contraseña actual es requerida</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nueva contraseña</mat-label>
          <input matInput [type]="hideNewPassword() ? 'password' : 'text'"
            formControlName="newPassword" autocomplete="new-password" />
          <button mat-icon-button matSuffix type="button"
            (click)="hideNewPassword.set(!hideNewPassword())"
            [attr.aria-label]="hideNewPassword() ? 'Mostrar nueva contraseña' : 'Ocultar nueva contraseña'">
            <mat-icon>{{ hideNewPassword() ? 'visibility' : 'visibility_off' }}</mat-icon>
          </button>
          @if (form.controls.newPassword.hasError('required') && form.controls.newPassword.touched) {
            <mat-error>La nueva contraseña es requerida</mat-error>
          } @else if (form.controls.newPassword.hasError('minlength') && form.controls.newPassword.touched) {
            <mat-error>Mínimo 8 caracteres</mat-error>
          } @else if (form.controls.newPassword.hasError('pattern') && form.controls.newPassword.touched) {
            <mat-error>Debe incluir al menos una mayúscula, un número y un símbolo</mat-error>
          }
          @if (form.controls.newPassword.dirty) {
            <mat-hint>Mín. 8 car., mayúscula, número y símbolo</mat-hint>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Confirmar contraseña</mat-label>
          <input matInput [type]="hideConfirmPassword() ? 'password' : 'text'"
            formControlName="confirmPassword" autocomplete="new-password" />
          <button mat-icon-button matSuffix type="button"
            (click)="hideConfirmPassword.set(!hideConfirmPassword())"
            [attr.aria-label]="hideConfirmPassword() ? 'Mostrar confirmación' : 'Ocultar confirmación'">
            <mat-icon>{{ hideConfirmPassword() ? 'visibility' : 'visibility_off' }}</mat-icon>
          </button>
          @if (form.controls.confirmPassword.hasError('required') && form.controls.confirmPassword.touched) {
            <mat-error>Confirma tu contraseña</mat-error>
          } @else if (form.hasError('passwordsMismatch') && form.controls.confirmPassword.touched) {
            <mat-error>Las contraseñas no coinciden</mat-error>
          }
        </mat-form-field>

        @if (errorMessage()) {
          <div class="error-banner" role="alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false" [disabled]="isLoading()">Cancelar</button>
      <button mat-raised-button color="primary" type="submit" form="change-pwd-form"
        [disabled]="form.invalid || isLoading()">
        @if (isLoading()) {
          <mat-spinner diameter="18" class="btn-spinner" />
        }
        <span>{{ isLoading() ? 'Guardando...' : 'Cambiar contraseña' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form {
      display: flex; flex-direction: column; gap: 4px;
      padding-top: 8px; min-width: 380px;
    }
    .full-width { width: 100%; }
    input[type=password]::-ms-reveal,
    input[type=password]::-webkit-credentials-auto-fill-button {
      display: none !important;
    }
    .error-banner {
      display: flex; align-items: center; gap: 8px;
      background-color: #fdecea; color: #c62828;
      border-radius: 4px; padding: 10px 12px; font-size: 14px;
      mat-icon { font-size: 18px; height: 18px; width: 18px; flex-shrink: 0; }
    }
    .btn-spinner { display: inline-block; ::ng-deep circle { stroke: #fff; } }
  `],
})
export class ChangePasswordDialogComponent {
  readonly hideCurrentPassword = signal(true);
  readonly hideNewPassword = signal(true);
  readonly hideConfirmPassword = signal(true);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = inject(FormBuilder).group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern('^(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).{8,}$'),
      ]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  readonly #authService = inject(AuthService);
  readonly #dialogRef = inject(MatDialogRef<ChangePasswordDialogComponent>);
  readonly #destroyRef = inject(DestroyRef);

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { currentPassword, newPassword } = this.form.getRawValue();

    this.#authService
      .changePassword({ currentPassword: currentPassword!, newPassword: newPassword! })
      .pipe(
        tap(() => this.#dialogRef.close(true)),
        catchError((err: AppError) => {
          this.errorMessage.set(this.#mapErrorCode(err.errorCode));
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #mapErrorCode(errorCode: string): string {
    switch (errorCode) {
      case 'CURRENT_PASSWORD_INVALID':
        return 'La contraseña actual es incorrecta';
      case 'WEAK_PASSWORD':
        return 'La nueva contraseña no cumple los requisitos';
      default:
        return 'Error al cambiar la contraseña';
    }
  }
}

// ---------------------------------------------------------------------------
// Layout component
// ---------------------------------------------------------------------------
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatTooltipModule,
  ],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  readonly isMobile = signal(false);
  readonly currentUser = inject(AuthService).currentUser;
  readonly isAdmin = computed(() => this.#authService.userRoles().includes('Admin'));

  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);
  readonly #dialog = inject(MatDialog);
  readonly #snackBar = inject(MatSnackBar);
  readonly #destroyRef = inject(DestroyRef);

  constructor() {
    inject(BreakpointObserver)
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(takeUntilDestroyed())
      .subscribe(state => this.isMobile.set(state.matches));
  }

  onChangePassword(): void {
    this.#dialog
      .open(ChangePasswordDialogComponent, { width: '440px', disableClose: true })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: boolean | undefined) => {
        if (result !== true) return;
        this.#snackBar.open(
          'Contraseña actualizada. Inicia sesión nuevamente',
          'OK',
          { duration: 3000 },
        );
        this.#authService
          .logout()
          .pipe(
            tap(() => this.#router.navigate(['/auth/login'])),
            catchError(() => {
              this.#router.navigate(['/auth/login']);
              return EMPTY;
            }),
            takeUntilDestroyed(this.#destroyRef),
          )
          .subscribe();
      });
  }

  onLogout(): void {
    this.#authService
      .logout()
      .pipe(
        tap(() => this.#router.navigate(['/auth/login'])),
        catchError(() => {
          this.#router.navigate(['/auth/login']);
          return EMPTY;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }
}