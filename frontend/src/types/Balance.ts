/**
 * Balance 타입 정의
 *
 * 주차권 잔여 수량 관련 타입 정의
 * API 명세서와 동기화되어 있음
 *
 * @see API_SPECIFICATION.md
 */

/**
 * 잔여 수량 응답 데이터
 *
 * GET /api/transactions/balance 응답
 *
 * @example
 * const balance: Balance = {
 *   total_purchased: 150,
 *   total_used: 87,
 *   current_balance: 63
 * };
 */
export interface Balance {
  /** 총 구매 수량 */
  total_purchased: number;

  /** 총 사용 수량 */
  total_used: number;

  /** 현재 잔여 수량 (구매 - 사용) */
  current_balance: number;
}

/**
 * 잔여 수량 상태
 *
 * 현재 잔여 수량에 따른 상태 분류
 */
export type BalanceStatus = 'sufficient' | 'warning' | 'low';

/**
 * 잔여 수량 임계값
 *
 * 잔여 수량 상태를 판단하는 기준
 */
export const BALANCE_THRESHOLDS = {
  /** 충분 (녹색) */
  SUFFICIENT: 50,

  /** 경고 (노란색) */
  WARNING: 20,
} as const;

/**
 * 잔여 수량 상태 계산
 *
 * @param balance - 현재 잔여 수량
 * @returns 잔여 수량 상태
 *
 * @example
 * getBalanceStatus(100); // 'sufficient'
 * getBalanceStatus(30);  // 'warning'
 * getBalanceStatus(10);  // 'low'
 */
export function getBalanceStatus(balance: number): BalanceStatus {
  if (balance >= BALANCE_THRESHOLDS.SUFFICIENT) {
    return 'sufficient';
  }
  if (balance >= BALANCE_THRESHOLDS.WARNING) {
    return 'warning';
  }
  return 'low';
}

/**
 * 잔여 수량 색상 클래스 (Tailwind CSS)
 *
 * UI에서 잔여 수량 상태에 따른 색상 표시
 */
export const BALANCE_STATUS_COLORS: Record<BalanceStatus, string> = {
  sufficient: 'text-green-600',
  warning: 'text-yellow-600',
  low: 'text-red-600',
};

/**
 * 잔여 수량 배경 색상 클래스 (Tailwind CSS)
 */
export const BALANCE_STATUS_BG_COLORS: Record<BalanceStatus, string> = {
  sufficient: 'bg-green-50 border-green-200',
  warning: 'bg-yellow-50 border-yellow-200',
  low: 'bg-red-50 border-red-200',
};

/**
 * 잔여 수량 상태 레이블
 */
export const BALANCE_STATUS_LABELS: Record<BalanceStatus, string> = {
  sufficient: '충분',
  warning: '경고',
  low: '부족',
};
