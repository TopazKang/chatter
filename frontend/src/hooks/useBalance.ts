/**
 * useBalance 커스텀 훅
 *
 * 주차권 잔여 수량 관련 비즈니스 로직을 캡슐화한 훅
 *
 * 제공 기능:
 * - 잔여 수량 조회
 * - 자동 새로고침 (선택적)
 * - 로딩 상태 관리
 * - 에러 처리
 *
 * @example
 * const { balance, isLoading, refetch } = useBalance();
 *
 * // 자동 새로고침 활성화
 * const { balance } = useBalance({ autoRefresh: true, refreshInterval: 30000 });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { transactionApi } from '../services';
import type { Balance } from '../types';
import { ApiError } from '../types';

interface UseBalanceOptions {
  /** 자동 새로고침 활성화 여부 (기본: false) */
  autoRefresh?: boolean;

  /** 새로고침 간격 (ms, 기본: 30000 = 30초) */
  refreshInterval?: number;

  /** 초기 로드 여부 (기본: true) */
  initialLoad?: boolean;
}

interface UseBalanceReturn {
  /** 잔여 수량 데이터 */
  balance: Balance | null;

  /** 로딩 상태 */
  loading: boolean;

  /** 에러 메시지 */
  error: string | null;

  /** 수동 새로고침 함수 */
  fetchBalance: () => Promise<void>;

  /** 에러 초기화 함수 */
  clearError: () => void;

  /** 마지막 업데이트 시간 */
  lastUpdated: Date | null;
}

/**
 * useBalance 훅
 *
 * @param options - 옵션 객체
 * @returns 잔여 수량 관련 데이터 및 함수
 */
export const useBalance = (options: UseBalanceOptions = {}): UseBalanceReturn => {
  const {
    autoRefresh = false,
    refreshInterval = 30000,
    initialLoad = true,
  } = options;

  const [balance, setBalance] = useState<Balance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 타이머 ID 저장 (cleanup용)
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 에러 초기화
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 잔여 수량 조회
   */
  const fetchBalance = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await transactionApi.getBalance();
      setBalance(data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof ApiError ? err.message : '잔여 수량 조회에 실패했습니다.';
      setError(errorMessage);

      // 에러 발생 시 이전 데이터 유지 (null로 초기화하지 않음)
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 수동 새로고침
   */
  const refetch = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  /**
   * 초기 로드
   */
  useEffect(() => {
    if (initialLoad) {
      fetchBalance();
    }
  }, [initialLoad, fetchBalance]);

  /**
   * 자동 새로고침 설정
   */
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      // 타이머 설정
      timerRef.current = setInterval(() => {
        fetchBalance();
      }, refreshInterval);

      // Cleanup: 컴포넌트 언마운트 시 타이머 제거
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchBalance]);

  return {
    balance,
    loading: isLoading,
    error,
    fetchBalance,
    clearError,
    lastUpdated,
  };
};
