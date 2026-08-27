export type TabKey = 'overview' | 'design' | 'code';

export type IssueStatus =
  | 'In Progress'
  | 'Complete'
  | 'Pending';

export type CheckItem = {
  id: string;
  title: string;
  level: 'A' | 'AA';
  status: IssueStatus;
};

export type CheckGroup = {
  id: string;
  title: string;
  items: CheckItem[];
};