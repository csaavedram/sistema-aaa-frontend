import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { EMPTY, of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getAccessToken', 'refreshToken', 'logout']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add Bearer token to API requests', () => {
    authServiceSpy.getAccessToken.and.returnValue('test-token-123');
    const url = `${environment.apiUrl}/api/v1/users`;

    http.get(url).subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-123');
  });

  it('should NOT add token to external requests', () => {
    authServiceSpy.getAccessToken.and.returnValue('test-token-123');
    const url = 'https://external-cdn.com/asset.js';

    http.get(url).subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.headers.has('Authorization')).toBeFalse();
  });

  it('should call authService.refreshToken() on 401 from a protected API endpoint', () => {
    // Arrange
    authServiceSpy.getAccessToken.and.returnValue('expired-token');
    // refreshToken() devuelve of(undefined) — simula un refresh exitoso sin HTTP real
    authServiceSpy.refreshToken.and.returnValue(of(undefined as void));

    const url = `${environment.apiUrl}/api/v1/users`;
    let responseReceived = false;

    // Act: lanzar la petición
    http.get(url).subscribe({
      next: () => (responseReceived = true),
      error: () => {},
    });

    // Primera petición → responde con 401
    const firstReq = httpMock.expectOne(url);
    expect(firstReq.request.headers.get('Authorization')).toBe('Bearer expired-token');
    firstReq.flush(
      { errorCode: 'TOKEN_EXPIRED' },
      { status: 401, statusText: 'Unauthorized' },
    );

    // El interceptor llama a refreshToken() y reintenta la petición original
    // (of(undefined) emite síncronamente, así que el retry ya está en la cola)
    const retryReq = httpMock.expectOne(url);
    retryReq.flush({});

    // Assert: refreshToken fue llamado exactamente una vez y la respuesta llegó
    expect(authServiceSpy.refreshToken).toHaveBeenCalledTimes(1);
    expect(responseReceived).toBeTrue();
  });

  it('should NOT call refreshToken() on 401 from a no-retry auth endpoint', () => {
    // Arrange: las rutas de auth nunca deben provocar refresh (evita bucle infinito)
    authServiceSpy.getAccessToken.and.returnValue('token');
    authServiceSpy.logout.and.returnValue(EMPTY);

    const url = `${environment.apiUrl}/api/v1/auth/login`;

    // Act
    http.post(url, {}).subscribe({ error: () => {} });

    const req = httpMock.expectOne(url);
    req.flush({ errorCode: 'INVALID' }, { status: 401, statusText: 'Unauthorized' });

    // Assert: el interceptor deja pasar el error tal cual, sin reintentar
    expect(authServiceSpy.refreshToken).not.toHaveBeenCalled();
  });
});