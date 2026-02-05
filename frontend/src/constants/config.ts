/**
 * 애플리케이션 설정 상수
 *
 * 애플리케이션 전반에 사용되는 설정값 정의
 */

/**
 * API 관련 설정
 */
export const API_CONFIG = {
  /** API 기본 URL */
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',

  /** 요청 타임아웃 (ms) */
  TIMEOUT: 10000,

  /** 재시도 횟수 */
  RETRY_COUNT: 3,

  /** 재시도 간격 (ms) */
  RETRY_DELAY: 1000,
} as const;

/**
 * UI 관련 설정
 */
export const UI_CONFIG = {
  /** 로딩 딜레이 (ms) - 이 시간 이하의 요청은 로딩 표시 안 함 */
  LOADING_DELAY: 300,

  /** 토스트 알림 표시 시간 (ms) */
  TOAST_DURATION: 3000,

  /** 자동 새로고침 간격 (ms) */
  AUTO_REFRESH_INTERVAL: 30000, // 30초

  /** 페이지당 항목 수 (거래 내역 목록) */
  ITEMS_PER_PAGE: 20,
} as const;

/**
 * 비즈니스 규칙 설정
 */
export const BUSINESS_RULES = {
  /** 최소 사용자 이름 길이 */
  MIN_USER_NAME_LENGTH: 2,

  /** 최대 사용자 이름 길이 */
  MAX_USER_NAME_LENGTH: 50,

  /** 최소 주차권 수량 */
  MIN_QUANTITY: 1,

  /** 최대 주차권 수량 (한 번에 구매/사용 가능한 최대 수) */
  MAX_QUANTITY: 1000,

  /** 사용자 이름 허용 패턴 (한글, 영문, 숫자, 공백) */
  USER_NAME_PATTERN: /^[가-힣a-zA-Z0-9\s]+$/,
} as const;

/**
 * 애플리케이션 메타 정보
 */
export const APP_META = {
  /** 애플리케이션 이름 */
  NAME: '주차 관리 서비스',

  /** 버전 */
  VERSION: '1.0.0',

  /** 설명 */
  DESCRIPTION: '회사 주차권 구매/사용 관리 시스템',
} as const;
