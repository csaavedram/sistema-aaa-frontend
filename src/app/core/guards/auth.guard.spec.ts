import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let routerSpy: jasmine.SpyObj<Router>;
  let mockAuthService: { isAuthenticated: ReturnType<typeof signal<boolean>> };

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['createUrlTree']);
    mockAuthService = {
      isAuthenticated: signal(false)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: mockAuthService }
      ]
    });
  });

  it('should allow navigation when authenticated', () => {
    mockAuthService.isAuthenticated.set(true);
    
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBeTrue();
  });

  it('should redirect to login when not authenticated', () => {
    mockAuthService.isAuthenticated.set(false);
    const mockUrlTree = {} as UrlTree;
    routerSpy.createUrlTree.and.returnValue(mockUrlTree);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/protected-route' } as RouterStateSnapshot)
    );

    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/auth/login'], { queryParams: { returnUrl: '/protected-route' } });
    expect(result).toBe(mockUrlTree);
  });
});