export interface AuditLog {
  id: string;
  userId: string | null;
  eventType: string;
  resource: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogFilter {
  userId?: string;
  eventType?: string;
  resource?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  page: number;
  pageSize: number;
  totalItems?: number;
}
