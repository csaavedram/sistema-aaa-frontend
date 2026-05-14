import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { EMPTY } from 'rxjs';
import { AuditComponent } from './audit.component';
import { AuditService } from '../../../core/services/audit.service';

describe('AuditComponent', () => {
  let component: AuditComponent;
  let fixture: ComponentFixture<AuditComponent>;

  const mockAuditService = jasmine.createSpyObj('AuditService', [
    'getAuditLogs',
    'getAuditLogById',
  ]);
  mockAuditService.getAuditLogs.and.returnValue(EMPTY);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditComponent],
      providers: [
        provideHttpClient(),
        provideNoopAnimations(),
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
