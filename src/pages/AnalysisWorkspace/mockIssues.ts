// 백엔드가 없을 때만 사용할 임시 데이터
import type { AccessibilityIssue } from '@/types/accessibility';

export const mockIssues: AccessibilityIssue[] = [
  {
    id: 'issue-1',
    title: '색상 대비 실패',
    description:
      '일반 텍스트 색상과 배경색의 대비율이 접근성 기준을 충족하지 못합니다.',
    severity: 'critical',
    guideline: 'WCAG 2.1 AA',
  },
  {
    id: 'issue-2',
    title: '대체 텍스트 누락',
    description:
      '<img> 요소에 alt 속성이 없어 스크린 리더가 이미지를 인식하지 못합니다.',
    severity: 'warning',
    guideline: 'WCAG 2.1 A',
  },
  {
    id: 'issue-3',
    title: '버튼 크기 미흡',
    description:
      '터치 타겟 크기가 최소 권장 크기보다 작습니다.',
    severity: 'notice',
    guideline: 'WCAG 2.1 AA',
  },
];