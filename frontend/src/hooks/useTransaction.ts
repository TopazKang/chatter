/**
 * useTransaction 커스텀 훅
 *
 * 주차권 거래 관련 비즈니스 로직을 캡슐화한 훅
 *
 * 제공 기능:
 * - 거래 생성 (구매/사용)
 * - 전체 거래 내역 조회
 * - 사용자별 거래 내역 조회
 * - 로딩 상태 관리
 * - 에러 처리
 *
 * @example
 * const { createTransaction, isLoading, error } = useTransaction();
 *
 * const handleSubmit = async () => {
 *   const result = await createTransaction({
 *     user_name: '홍길동',
 *     type: 'purchase',
 *     quantity: 10
 *   });
 *   if (result) {
 *     console.log('거래 성공:', result);
 *   }
 * };
 */

import { useState, useCallback } from 'react';
import { transactionApi } from '../services';
import type { Transaction, TransactionRequest } from '../types';
import { ApiError } from '../types';

interface UseTransactionReturn {
  /** 거래 생성 함수 */
  createTransaction: (data: TransactionRequest) => Promise<Transaction | null>;

  /** 전체 거래 내역 조회 함수 */
  getTransactions: () => Promise<Transaction[]>;

  /** 사용자별 거래 내역 조회 함수 */
  getUserTransactions: (userName: string) => Promise<Transaction[]>;

  /** 로딩 상태 */
  isLoading: boolean;

  /** 에러 메시지 */
  error: string | null;

  /** 에러 초기화 함수 */
  clearError: () => void;
}

/**
 * useTransaction 훅
 *
 * @returns 거래 관련 함수 및 상태
 */
export const useTransaction = (): UseTransactionReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 에러 초기화
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 거래 생성 (주차권 구매/사용)
   *
   * @param data - 거래 데이터
   * @returns 생성된 거래 객체 (실패 시 null)
   */
  const createTransaction = useCallback(
    async (data: TransactionRequest): Promise<Transaction | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const transaction = await transactionApi.createTransaction(data);
        return transaction;
      } catch (err) {
        const errorMessage =
          err instanceof ApiError ? err.message : '거래 생성에 실패했습니다.';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 전체 거래 내역 조회
   *
   * @returns 거래 내역 배열 (실패 시 빈 배열)
   */
  const getTransactions = useCallback(async (): Promise<Transaction[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const transactions = await transactionApi.getTransactions();
      return transactions;
    } catch (err) {
      const errorMessage =
        err instanceof ApiError ? err.message : '거래 내역 조회에 실패했습니다.';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 사용자별 거래 내역 조회
   *
   * @param userName - 조회할 사용자 이름
   * @returns 해당 사용자의 거래 내역 배열 (실패 시 빈 배열)
   */
  const getUserTransactions = useCallback(async (userName: string): Promise<Transaction[]> => {
    if (!userName.trim()) {
      setError('사용자 이름을 입력해주세요.');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const transactions = await transactionApi.getUserTransactions(userName);
      return transactions;
    } catch (err) {
      const errorMessage =
        err instanceof ApiError ? err.message : '거래 내역 조회에 실패했습니다.';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createTransaction,
    getTransactions,
    getUserTransactions,
    isLoading,
    error,
    clearError,
  };
};
