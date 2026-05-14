import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { EMPTY } from 'rxjs';
import { RolesComponent } from './roles.component';
import { RolesService } from '../../../core/services/roles.service';

describe('RolesComponent', () => {
  let component: RolesComponent;
  let fixture: ComponentFixture<RolesComponent>;

  const mockRolesService = jasmine.createSpyObj('RolesService', [
    'getRoles',
    'getRoleById',
    'createRole',
    'deleteRole',
    'getRolePermissions',
    'assignPermissions',
    'assignRoleToUser',
    'removeRoleFromUser',
  ]);
  mockRolesService.getRoles.and.returnValue(EMPTY);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesComponent],
      providers: [
        provideHttpClient(),
        provideNoopAnimations(),
        { provide: RolesService, useValue: mockRolesService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RolesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
