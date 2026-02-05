/**
 * Transaction 타입 정의
 *
 * 주차권 거래 관련 타입 정의
 * API 명세서와 동기화되어 있음
 *
 * @see API_SPECIFICATION.md
 */

/**
 * 거래 유형
 *
 * - purchase: 주차권 구매
 * - use: 주차권 사용
 */
export type TransactionType = 'purchase' | 'use';

/**
 * 거래 생성 요청 데이터
 *
 * POST /api/transactions 요청 body
 *
 * @example
 * const request: TransactionRequest = {
 *   userName: '홍길동',
 *   type: 'purchase',
 *   quantity: 10
 * };
 */
export interface TransactionRequest {
  /** 사용자 이름 (2-50자, 한글/영문/숫자) */
  userName: string;

  /** 거래 유형 (구매 또는 사용) */
  type: TransactionType;

  /** 수량 (1 이상의 정수) */
  quantity: number;
}

/**
 * 거래 응답 데이터
 *
 * API 응답에서 반환되는 거래 객체
 *
 * @example
 * const transaction: Transaction = {
 *   id: 1,
 *   userName: '홍길동',
 *   type: 'purchase',
 *   quantity: 10,
 *   createdAt: '2024-01-15T10:30:00Z'
 * };
 */
export interface Transaction {
  /** 거래 고유 ID */
  id: number;

  /** 사용자 이름 */
  userName: string;

  /** 거래 유형 */
  type: TransactionType;

  /** 수량 */
  quantity: number;

  /** 거래 생성 시간 (ISO 8601 형식) */
  createdAt: string;
}

/**
 * 거래 유형 한글 레이블
 *
 * UI에서 사용자에게 표시할 때 사용
 */
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  purchase: '구매',
  use: '사용',
};

/**
 * 거래 유형 색상 (Tailwind CSS 클래스)
 *
 * UI에서 거래 유형에 따른 색상 표시
 */
export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  purchase: 'text-green-600',
  use: 'text-blue-600',
};
