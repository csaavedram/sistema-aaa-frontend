import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { EMPTY, of } from 'rxjs';
import { UsersComponent } from './users.component';
import { UsersService } from '../../../core/services/users.service';
import { User } from '../../../core/models/users.models';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let mockUsersService: jasmine.SpyObj<UsersService>;

  beforeEach(async () => {
    mockUsersService = jasmine.createSpyObj('UsersService', [
      'getUsers',
      'getUserById',
      'createUser',
      'updateUser',
      'deleteUser',
      'getUserPermissions',
    ]);
    mockUsersService.getUsers.and.returnValue(EMPTY);

    await TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        provideHttpClient(),
        provideNoopAnimations(),
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render user emails in the table when the service returns data', () => {
    const mockUsers: User[] = [
      {
        id: 'id-1',
        email: 'alice@test.com',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'id-2',
        email: 'bob@test.com',
        isActive: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];
    mockUsersService.getUsers.and.returnValue(
      of({ success: true, data: { users: mockUsers, page: 1, pageSize: 20, totalItems: 2 } }),
    );

    component.loadUsers();
    fixture.detectChanges();

    const emailCells: NodeListOf<HTMLTableCellElement> =
      fixture.nativeElement.querySelectorAll('td.mat-column-email');
    expect(emailCells.length).toBe(2);
    expect(emailCells[0].textContent?.trim()).toBe('alice@test.com');
    expect(emailCells[1].textContent?.trim()).toBe('bob@test.com');
  });

  it('should call deleteUser with the correct ID when the user confirms the deletion dialog', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    mockUsersService.deleteUser.and.returnValue(of({ success: true, data: true }));

    component.onDeleteUser('user-abc-123');

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(mockUsersService.deleteUser).toHaveBeenCalledOnceWith('user-abc-123');
  });
});
