import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BreakpointObserver } from '@angular/cdk/layout';
import { signal } from '@angular/core';
import { EMPTY } from 'rxjs';
import { AdminLayoutComponent } from './admin-layout.component';
import { AuthService } from '../../core/services/auth.service';

describe('AdminLayoutComponent', () => {
  let component: AdminLayoutComponent;
  let fixture: ComponentFixture<AdminLayoutComponent>;

  const mockAuthService = jasmine.createSpyObj(
    'AuthService',
    ['logout'],
    {
      currentUser: signal(null),
      isAuthenticated: signal(false),
      userRoles: signal([]),
      userPermissions: signal([]),
    },
  );
  mockAuthService.logout.and.returnValue(EMPTY);

  const mockBreakpointObserver = jasmine.createSpyObj('BreakpointObserver', ['observe']);
  mockBreakpointObserver.observe.and.returnValue(EMPTY);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideNoopAnimations(),
        { provide: AuthService, useValue: mockAuthService },
        { provide: BreakpointObserver, useValue: mockBreakpointObserver },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
