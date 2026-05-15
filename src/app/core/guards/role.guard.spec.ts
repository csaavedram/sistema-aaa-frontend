import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';

describe('roleGuard', () => {
  let routerSpy: jasmine.SpyObj<Router>;
  let mockAuthService: { userRoles: ReturnType<typeof signal<string[]>> };

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['createUrlTree']);
    mockAuthService = {
      userRoles: signal([])
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: mockAuthService }
      ]
    });
  });

  it('should allow navigation when user has required role', () => {
    mockAuthService.userRoles.set(['Admin', 'SuperUser']);
    const route = { data: { requiredRoles: ['Admin'] } } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as RouterStateSnapshot)
    );

    expect(result).toBeTrue();
  });

  it('should redirect to unauthorized when user lacks role', () => {
    mockAuthService.userRoles.set(['User']);
    const route = { data: { requiredRoles: ['Admin'] } } as unknown as ActivatedRouteSnapshot;
    const mockUrlTree = {} as UrlTree;
    routerSpy.createUrlTree.and.returnValue(mockUrlTree);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as RouterStateSnapshot)
    );

    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/unauthorized']);
    expect(result).toBe(mockUrlTree);
  });
});