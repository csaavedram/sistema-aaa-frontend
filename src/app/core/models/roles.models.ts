export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

export interface CreateRoleRequest {
  name: string;
  description: string;
}

export interface AssignPermissionsRequest {
  permissionIds: string[];
}
