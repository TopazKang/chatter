/**
 * 타입 정의 모듈 진입점
 *
 * 모든 타입을 한 곳에서 export하여 import 경로 단순화
 *
 * @example
 * // ✅ 좋은 예
 * import { Transaction, Balance, ApiResponse } from '@/types';
 *
 * // ❌ 나쁜 예
 * import { Transaction } from '@/types/Transaction';
 * import { Balance } from '@/types/Balance';
 * import { ApiResponse } from '@/types/ApiResponse';
 */

// Transaction 관련 타입
export type { Transaction, TransactionRequest, TransactionType } from './Transaction';
export { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS } from './Transaction';

// Balance 관련 타입
export type { Balance, BalanceStatus } from './Balance';
export {
  BALANCE_THRESHOLDS,
  BALANCE_STATUS_COLORS,
  BALANCE_STATUS_BG_COLORS,
  BALANCE_STATUS_LABELS,
  getBalanceStatus,
} from './Balance';

// API 응답 관련 타입
export type { ApiResponse } from './ApiResponse';
export { ApiError, ApiErrorCode, ERROR_MESSAGES } from './ApiResponse';
