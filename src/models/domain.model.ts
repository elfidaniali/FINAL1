export interface DomainCheck {
  status: 'healthy' | 'down' | 'flagged';
  checkedAt: Date;
}

export interface Domain {
  id: number;
  url: string;
  status: 'healthy' | 'down' | 'flagged' | 'pending';
  last_checked: Date | null;
  notes?: string;
  checking?: boolean;
  suggestions?: string;
  history?: DomainCheck[];
  isEditing?: boolean;
  showNotes?: boolean;
}
