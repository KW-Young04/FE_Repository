import type { CheckGroup } from './types';

export const groups: CheckGroup[] = [
  {
    id: 'visual',
    title: '시각 품질 (Visual)',
    items: [
      {
        id: '1.1.1',
        title: '텍스트 대체',
        level: 'A',
        status: 'In Progress',
      },
      {
        id: '3.3.2',
        title: '레이블 또는 안내',
        level: 'AA',
        status: 'Complete',
      },
      {
        id: '2.6.8',
        title: '대상 크기',
        level: 'A',
        status: 'Pending',
      },
      {
        id: '1.4.3',
        title: '명도 대비',
        level: 'AA',
        status: 'Pending',
      },
    ],
  },

  {
    id: 'interaction',
    title: '구조/동작 품질 (Interaction)',
    items: [
      {
        id: '2.3.4',
        title: 'DOM/시맨틱',
        level: 'A',
        status: 'Pending',
      },
      {
        id: '2.2.3',
        title: '폼 속성/자동 완성',
        level: 'AA',
        status: 'Pending',
      },
      {
        id: '2.4.6',
        title: '문서 메타 데이터',
        level: 'A',
        status: 'Pending',
      },
    ],
  },

  {
    id: 'ux',
    title: '전체 경험 (UX)',
    items: [
      {
        id: '1.2.4',
        title: '일관된 식별',
        level: 'A',
        status: 'Pending',
      },
      {
        id: '5.7.8',
        title: '헬프 메커니즘',
        level: 'AA',
        status: 'Pending',
      },
    ],
  },
];