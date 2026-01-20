export interface Organization {
  id: string;
  name: string;
  role: string;
}

export interface OrgMembership {
  organizationId: string;
  userId: string;
  role: 'owner' | 'member' | 'viewer';
}