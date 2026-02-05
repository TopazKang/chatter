/**
 * 입력 검증 유틸리티
 *
 * 사용자 입력 데이터 검증 함수 모음
 *
 * 설계 원칙:
 * - 클라이언트 측 검증 (사용자 경험 향상)
 * - 서버 측 검증과 동일한 규칙 적용
 * - 명확한 에러 메시지 제공
 */

import type { TransactionRequest } from '../types';

/**
 * 검증 에러 타입
 *
 * 필드명을 키로, 에러 메시지를 값으로 가지는 객체
 */
export type ValidationErrors = Record<string, string>;

/**
 * TransactionForm 입력 검증
 *
 * @param data - 검증할 거래 데이터
 * @returns 검증 에러 객체 (에러가 없으면 빈 객체)
 *
 * @example
 * const errors = validateTransactionForm({
 *   userName: '',
 *   type: 'purchase',
 *   quantity: -5
 * });
 * // { userName: '이름을 입력해주세요.', quantity: '수량은 1개 이상이어야 합니다.' }
 */
export const validateTransactionForm = (data: TransactionRequest): ValidationErrors => {
  const errors: ValidationErrors = {};

  // 1. 사용자 이름 검증
  if (!data.userName || !data.userName.trim()) {
    errors.userName = '이름을 입력해주세요.';
  } else if (data.userName.trim().length < 2) {
    errors.userName = '이름은 2자 이상이어야 합니다.';
  } else if (data.userName.trim().length > 50) {
    errors.userName = '이름은 50자 이하여야 합니다.';
  } else if (!/^[가-힣a-zA-Z0-9\s]+$/.test(data.userName)) {
    errors.userName = '이름은 한글, 영문, 숫자만 가능합니다.';
  }

  // 2. 거래 유형 검증
  if (!data.type || !['purchase', 'use'].includes(data.type)) {
    errors.type = '구매 또는 사용을 선택해주세요.';
  }

  // 3. 수량 검증
  if (data.quantity === undefined || data.quantity === null) {
    errors.quantity = '수량을 입력해주세요.';
  } else if (!Number.isInteger(data.quantity)) {
    errors.quantity = '수량은 정수만 가능합니다.';
  } else if (data.quantity < 1) {
    errors.quantity = '수량은 1개 이상이어야 합니다.';
  } else if (data.quantity > 10000) {
    // 비즈니스 규칙: 한 번에 10000개 초과 불가
    errors.quantity = '수량은 10,000개 이하여야 합니다.';
  }

  return errors;
};

/**
 * 사용자 이름 검증 (단일 필드)
 *
 * @param userName - 검증할 사용자 이름
 * @returns 에러 메시지 (유효하면 null)
 *
 * @example
 * validateUserName('홍길동'); // null (유효)
 * validateUserName(''); // '이름을 입력해주세요.'
 */
export const validateUserName = (userName: string): string | null => {
  if (!userName || !userName.trim()) {
    return '이름을 입력해주세요.';
  }
  if (userName.trim().length < 2) {
    return '이름은 2자 이상이어야 합니다.';
  }
  if (userName.trim().length > 50) {
    return '이름은 50자 이하여야 합니다.';
  }
  if (!/^[가-힣a-zA-Z0-9\s]+$/.test(userName)) {
    return '이름은 한글, 영문, 숫자만 가능합니다.';
  }
  return null;
};

/**
 * 수량 검증 (단일 필드)
 *
 * @param quantity - 검증할 수량 (문자열 또는 숫자)
 * @returns 에러 메시지 (유효하면 null)
 *
 * @example
 * validateQuantity('10'); // null (유효)
 * validateQuantity('-5'); // '수량은 1개 이상이어야 합니다.'
 * validateQuantity('abc'); // '수량은 정수만 가능합니다.'
 */
export const validateQuantity = (quantity: string | number): string | null => {
  // 빈 값 체크
  if (quantity === undefined || quantity === null || quantity === '') {
    return '수량을 입력해주세요.';
  }

  // 문자열을 숫자로 변환
  const numValue = typeof quantity === 'string' ? parseFloat(quantity) : quantity;

  // 숫자가 아닌 경우
  if (isNaN(numValue)) {
    return '수량은 정수만 가능합니다.';
  }

  // 정수가 아닌 경우
  if (!Number.isInteger(numValue)) {
    return '수량은 정수만 가능합니다.';
  }

  // 범위 체크
  if (numValue < 1) {
    return '수량은 1개 이상이어야 합니다.';
  }
  if (numValue > 10000) {
    return '수량은 10,000개 이하여야 합니다.';
  }

  return null;
};

/**
 * 검증 에러가 있는지 확인
 *
 * @param errors - 검증 에러 객체
 * @returns 에러가 있으면 true, 없으면 false
 *
 * @example
 * const errors = validateTransactionForm(data);
 * if (hasValidationErrors(errors)) {
 *   console.error('입력 오류가 있습니다.');
 * }
 */
export const hasValidationErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};
