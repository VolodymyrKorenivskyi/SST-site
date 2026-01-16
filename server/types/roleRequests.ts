export interface RoleRequest {
  id: number;
  userId: number;
  requestedRoleId: number;
  status: 'pending' | 'approved' | 'rejected';
  message?: string | null;
  reviewedBy?: number | null;
  reviewedAt?: Date | null;
  createdAt: Date;
}

export interface CreateRoleRequestRequest {
  requestedRoleId: number;
  message?: string;
}

export interface ReviewRoleRequestRequest {
  status: 'approved' | 'rejected';
  message?: string;
}
