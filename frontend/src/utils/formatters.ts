/**
 * 데이터 포맷팅 유틸리티
 *
 * UI에 표시할 데이터를 사용자 친화적인 형식으로 변환하는 함수 모음
 *
 * 설계 원칙:
 * - 순수 함수 (side effect 없음)
 * - 불변성 유지
 * - 명확한 입출력
 */

/**
 * 날짜/시간 포맷팅
 *
 * ISO 8601 형식을 한국 시간대의 사용자 친화적 형식으로 변환
 *
 * @param isoString - ISO 8601 형식의 날짜/시간 문자열
 * @returns 포맷팅된 날짜/시간 문자열
 *
 * @example
 * formatDateTime('2024-01-15T10:30:00Z');
 * // '2024년 1월 15일 19:30' (한국 시간대)
 */
export const formatDateTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);

    // 유효한 날짜인지 확인
    if (isNaN(date.getTime())) {
      return isoString; // 원본 반환
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
  } catch (error) {
    return isoString;
  }
};

/**
 * 날짜만 포맷팅 (시간 포함, 간략 형식)
 *
 * ISO 8601 형식을 간략한 날짜/시간 형식으로 변환
 * TransactionList에서 사용
 *
 * @param isoString - ISO 8601 형식의 날짜/시간 문자열
 * @returns 포맷팅된 날짜/시간 문자열
 *
 * @example
 * formatDate('2024-01-15T10:30:00Z');
 * // '2024. 1. 15. 10:30'
 */
export const formatDate = (isoString: string): string => {
  try {
    const date = new Date(isoString);

    // 유효한 날짜인지 확인
    if (isNaN(date.getTime())) {
      return isoString; // 원본 반환
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${year}. ${month}. ${day}. ${hours}:${minutes}`;
  } catch (error) {
    return isoString;
  }
};

/**
 * 상대 시간 포맷팅
 *
 * 주어진 날짜/시간과 현재 시간의 차이를 상대적으로 표현
 *
 * @param isoString - ISO 8601 형식의 날짜/시간 문자열
 * @returns 상대 시간 문자열
 *
 * @example
 * formatRelativeTime('2024-01-15T10:30:00Z');
 * // '5분 전' 또는 '2시간 전' 또는 '3일 전'
 */
export const formatRelativeTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return '방금 전';
    } else if (diffMin < 60) {
      return `${diffMin}분 전`;
    } else if (diffHour < 24) {
      return `${diffHour}시간 전`;
    } else if (diffDay < 7) {
      return `${diffDay}일 전`;
    } else {
      // 7일 이상이면 절대 날짜 표시
      return formatDateTime(isoString);
    }
  } catch (error) {
    return isoString;
  }
};

/**
 * 숫자 포맷팅 (천 단위 구분)
 *
 * @param num - 포맷팅할 숫자
 * @returns 천 단위 콤마가 추가된 문자열
 *
 * @example
 * formatNumber(1234567); // '1,234,567'
 * formatNumber(100); // '100'
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString('ko-KR');
};

/**
 * 주차권 수량 포맷팅
 *
 * @param quantity - 주차권 수량
 * @returns 포맷팅된 수량 문자열 (단위 포함)
 *
 * @example
 * formatQuantity(10); // '10개'
 * formatQuantity(1234); // '1,234개'
 */
export const formatQuantity = (quantity: number): string => {
  return `${formatNumber(quantity)}개`;
};

/**
 * 잔여율 계산 및 포맷팅
 *
 * @param current - 현재 잔여 수량
 * @param total - 총 구매 수량
 * @returns 포맷팅된 잔여율 문자열
 *
 * @example
 * formatBalancePercentage(63, 150); // '42.0%'
 * formatBalancePercentage(0, 0); // '0.0%'
 */
export const formatBalancePercentage = (current: number, total: number): string => {
  if (total === 0) {
    return '0.0%';
  }

  const percentage = (current / total) * 100;
  return `${percentage.toFixed(1)}%`;
};

/**
 * 거래 유형 한글 변환
 *
 * @param type - 거래 유형 ('purchase' | 'use')
 * @returns 한글 레이블
 *
 * @example
 * formatTransactionType('purchase'); // '구매'
 * formatTransactionType('use'); // '사용'
 */
export const formatTransactionType = (type: 'purchase' | 'use'): string => {
  return type === 'purchase' ? '구매' : '사용';
};

/**
 * 에러 메시지 포맷팅
 *
 * 기술적 에러 메시지를 사용자 친화적 메시지로 변환
 *
 * @param error - Error 객체 또는 에러 메시지
 * @returns 사용자 친화적 에러 메시지
 *
 * @example
 * formatErrorMessage(new Error('Network Error'));
 * // '네트워크 연결을 확인해주세요.'
 */
export const formatErrorMessage = (error: unknown): string => {
  if (!error) {
    return '알 수 없는 오류가 발생했습니다.';
  }

  if (error instanceof Error) {
    // 이미 사용자 친화적 메시지면 그대로 반환
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '알 수 없는 오류가 발생했습니다.';
};

/**
 * 잔여 수량 상태 텍스트
 *
 * @param balance - 현재 잔여 수량
 * @returns 상태 텍스트
 *
 * @example
 * getBalanceStatusText(100); // '충분합니다'
 * getBalanceStatusText(30); // '주의가 필요합니다'
 * getBalanceStatusText(10); // '부족합니다'
 */
export const getBalanceStatusText = (balance: number): string => {
  if (balance >= 50) {
    return '충분합니다';
  } else if (balance >= 20) {
    return '주의가 필요합니다';
  } else if (balance > 0) {
    return '부족합니다';
  } else {
    return '주차권이 없습니다';
  }
};
