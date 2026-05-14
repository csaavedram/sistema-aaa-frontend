export interface User {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  email?: string;
}

export interface UserListResponse {
  users: User[];
  page: number;
  pageSize: number;
  totalItems?: number;
}
