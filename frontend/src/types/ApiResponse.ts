/**
 * API 응답 타입 정의
 *
 * 모든 API 응답이 따르는 공통 타입 정의
 * API 명세서의 표준 응답 형식과 동기화
 *
 * @see API_SPECIFICATION.md
 */

/**
 * API 표준 응답 형식
 *
 * 모든 API 응답이 이 구조를 따름
 *
 * @template T - 성공 시 반환되는 데이터 타입
 *
 * @example
 * // 성공 응답
 * const successResponse: ApiResponse<Transaction> = {
 *   success: true,
 *   data: {
 *     id: 1,
 *     user_name: '홍길동',
 *     type: 'purchase',
 *     quantity: 10,
 *     created_at: '2024-01-15T10:30:00Z'
 *   }
 * };
 *
 * @example
 * // 에러 응답
 * const errorResponse: ApiResponse<never> = {
 *   success: false,
 *   error: '사용자 이름은 필수입니다.',
 *   errorCode: 'VALIDATION_ERROR'
 * };
 */
export interface ApiResponse<T = unknown> {
  /** 요청 성공 여부 */
  success: boolean;

  /** 성공 시 반환되는 데이터 (success: true일 때만 존재) */
  data?: T;

  /** 에러 메시지 (success: false일 때만 존재) */
  error?: string;

  /** 에러 코드 (success: false일 때만 존재) */
  errorCode?: string;
}

/**
 * API 에러 코드
 *
 * 백엔드에서 반환하는 에러 코드 정의
 */
export enum ApiErrorCode {
  /** 검증 에러 (400) */
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  /** 리소스를 찾을 수 없음 (404) */
  NOT_FOUND = 'NOT_FOUND',

  /** 서버 내부 에러 (500) */
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',

  /** 네트워크 에러 (클라이언트 측) */
  NETWORK_ERROR = 'NETWORK_ERROR',

  /** 타임아웃 에러 */
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

/**
 * API 에러 클래스
 *
 * API 호출 실패 시 사용하는 커스텀 에러 클래스
 *
 * @example
 * try {
 *   const data = await api.get('/transactions');
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error('API Error:', error.message, error.code);
 *   }
 * }
 */
export class ApiError extends Error {
  /** 에러 코드 */
  public readonly code: string;

  /** HTTP 상태 코드 */
  public readonly statusCode?: number;

  constructor(message: string, code: string = ApiErrorCode.INTERNAL_SERVER_ERROR, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;

    // TypeScript의 instanceof가 제대로 동작하도록 프로토타입 설정
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * 에러 코드에 따른 사용자 친화적 메시지
 *
 * UI에서 사용자에게 표시할 메시지
 */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  [ApiErrorCode.VALIDATION_ERROR]: '입력 정보를 확인해주세요.',
  [ApiErrorCode.NOT_FOUND]: '요청하신 정보를 찾을 수 없습니다.',
  [ApiErrorCode.INTERNAL_SERVER_ERROR]: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  [ApiErrorCode.NETWORK_ERROR]: '네트워크 연결을 확인해주세요.',
  [ApiErrorCode.TIMEOUT_ERROR]: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
};
