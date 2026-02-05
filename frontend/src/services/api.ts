/**
 * Axios 인스턴스 설정
 *
 * 모든 API 요청에서 사용하는 중앙화된 Axios 인스턴스
 *
 * 주요 기능:
 * - baseURL 설정
 * - 타임아웃 설정
 * - 요청/응답 인터셉터
 * - 전역 에러 핸들링
 */

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ApiError, ApiErrorCode, type ApiResponse } from '../types';

/**
 * API 기본 URL
 *
 * 환경 변수에서 가져오며, 없으면 기본값 사용
 * - 개발: http://localhost:3000/api
 * - 프로덕션: 환경 변수로 설정
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Axios 인스턴스 생성
 *
 * 모든 API 요청이 이 인스턴스를 사용
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10초
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 요청 인터셉터
 *
 * 모든 요청이 전송되기 전에 실행
 *
 * 기능:
 * - 개발 환경에서 요청 로깅
 * - 인증 토큰 추가 (향후 확장)
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 개발 환경에서만 요청 로깅
    if (import.meta.env.DEV) {
      console.log('🚀 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
      });
    }

    // TODO: 향후 인증 토큰 추가
    // const token = localStorage.getItem('auth_token');
    // if (token && config.headers) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    return config;
  },
  (error: AxiosError) => {
    // 요청 설정 중 에러 발생
    console.error('❌ Request Setup Error:', error);
    return Promise.reject(error);
  }
);

/**
 * 응답 인터셉터
 *
 * 모든 응답을 받은 후 실행
 *
 * 기능:
 * - 표준 응답 형식 { success, data } 처리
 * - HTTP 에러를 ApiError로 변환
 * - 에러 로깅
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    // 개발 환경에서만 응답 로깅
    if (import.meta.env.DEV) {
      console.log('✅ API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data,
      });
    }

    // 표준 응답 형식: { success: true, data: {...} }
    // data 필드만 추출하여 반환
    if (response.data && response.data.success) {
      return response.data.data;
    }

    // success가 false인 경우 (서버에서 명시적 실패)
    if (response.data && !response.data.success) {
      const errorMessage = response.data.error || '알 수 없는 오류가 발생했습니다.';
      const errorCode = response.data.errorCode || ApiErrorCode.INTERNAL_SERVER_ERROR;

      throw new ApiError(errorMessage, errorCode, response.status);
    }

    // 표준 형식이 아닌 경우 원본 반환
    return response.data;
  },
  (error: AxiosError<ApiResponse<never>>) => {
    // HTTP 에러 처리
    let errorMessage = '알 수 없는 오류가 발생했습니다.';
    let errorCode = ApiErrorCode.INTERNAL_SERVER_ERROR;
    let statusCode: number | undefined;

    if (error.response) {
      // 서버 응답이 있는 경우 (4xx, 5xx)
      statusCode = error.response.status;
      errorMessage = error.response.data?.error || error.message;
      errorCode = error.response.data?.errorCode || ApiErrorCode.INTERNAL_SERVER_ERROR;

      // HTTP 상태 코드에 따른 에러 코드 매핑
      if (statusCode === 400) {
        errorCode = ApiErrorCode.VALIDATION_ERROR;
      } else if (statusCode === 404) {
        errorCode = ApiErrorCode.NOT_FOUND;
      }
    } else if (error.request) {
      // 요청은 전송되었으나 응답이 없는 경우 (네트워크 에러)
      errorMessage = '네트워크 연결을 확인해주세요.';
      errorCode = ApiErrorCode.NETWORK_ERROR;
    } else if (error.code === 'ECONNABORTED') {
      // 타임아웃 에러
      errorMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요.';
      errorCode = ApiErrorCode.TIMEOUT_ERROR;
    }

    // 개발 환경에서 에러 상세 로깅
    if (import.meta.env.DEV) {
      console.error('❌ API Error:', {
        message: errorMessage,
        code: errorCode,
        statusCode,
        originalError: error,
      });
    }

    // ApiError 객체로 변환하여 throw
    return Promise.reject(new ApiError(errorMessage, errorCode, statusCode));
  }
);

/**
 * API 클라이언트 설정 정보 (디버깅용)
 */
export const getApiConfig = () => ({
  baseURL: API_BASE_URL,
  timeout: apiClient.defaults.timeout,
  headers: apiClient.defaults.headers,
});
