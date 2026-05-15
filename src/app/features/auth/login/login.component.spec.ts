import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, withDisabledInitialNavigation } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Subject, of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let navigateSpy: jasmine.Spy;

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['login']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(),
        provideNoopAnimations(),
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    navigateSpy = spyOn(TestBed.inject(Router), 'navigate');

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not submit if form is invalid', () => {
    component.onSubmit();

    expect(authServiceSpy.login).not.toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });

  it('should call authService.login with form values on valid submit', () => {
    authServiceSpy.login.and.returnValue(of(undefined));
    component.form.patchValue({ email: 'qa@test.com', password: 'ValidPassword123!' });

    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalledWith({
      email: 'qa@test.com',
      password: 'ValidPassword123!',
    });
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/users']);
  });

  it('should display error message on login failure', () => {
    authServiceSpy.login.and.returnValue(throwError(() => ({ errorCode: 'AUTH_INVALID_CREDENTIALS' })));
    component.form.patchValue({ email: 'qa@test.com', password: 'WrongPassword!' });

    component.onSubmit();

    expect(component.errorMessage()).toBe('Email o contraseña incorrectos');
  });

  it('should set isLoading to true while the request is pending and false after completion', () => {
    const loginSubject = new Subject<void>();
    authServiceSpy.login.and.returnValue(loginSubject.asObservable());
    component.form.patchValue({ email: 'qa@test.com', password: 'ValidPassword123!' });

    component.onSubmit();

    expect(component.isLoading()).toBeTrue();

    loginSubject.next();
    loginSubject.complete();

    expect(component.isLoading()).toBeFalse();
  });
});
