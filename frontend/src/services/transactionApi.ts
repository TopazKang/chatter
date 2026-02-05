/**
 * Transaction API 서비스
 *
 * 주차권 거래 관련 API 호출 함수 모음
 *
 * 설계 원칙:
 * - 모든 API 호출을 캡슐화하여 컴포넌트에서 직접 axios를 사용하지 않도록 함
 * - 타입 안정성 보장
 * - 에러 처리 일관성
 *
 * @see API_SPECIFICATION.md
 */

import { apiClient } from './api';
import type { Transaction, TransactionRequest, Balance } from '../types';

/**
 * Transaction API 서비스 객체
 *
 * 모든 API 함수를 하나의 객체로 그룹화
 *
 * @example
 * import { transactionApi } from '@/services/transactionApi';
 *
 * // 주차권 구매
 * const transaction = await transactionApi.createTransaction({
 *   user_name: '홍길동',
 *   type: 'purchase',
 *   quantity: 10
 * });
 */
export const transactionApi = {
  /**
   * 주차권 구매/사용 기록 생성
   *
   * POST /api/transactions
   *
   * @param data - 거래 생성 요청 데이터
   * @returns 생성된 거래 객체
   * @throws {ApiError} 검증 실패, 네트워크 에러, 서버 에러
   *
   * @example
   * const transaction = await transactionApi.createTransaction({
   *   user_name: '홍길동',
   *   type: 'purchase',
   *   quantity: 10
   * });
   * console.log(transaction.id); // 1
   */
  createTransaction: async (data: TransactionRequest): Promise<Transaction> => {
    return apiClient.post<never, Transaction>('/transactions', data);
  },

  /**
   * 전체 거래 내역 조회
   *
   * GET /api/transactions
   *
   * @returns 전체 거래 내역 배열 (최신순 정렬)
   * @throws {ApiError} 네트워크 에러, 서버 에러
   *
   * @example
   * const transactions = await transactionApi.getTransactions();
   * console.log(transactions.length); // 전체 거래 수
   */
  getTransactions: async (): Promise<Transaction[]> => {
    return apiClient.get<never, Transaction[]>('/transactions');
  },

  /**
   * 현재 잔여 주차권 수량 조회
   *
   * GET /api/transactions/balance
   *
   * @returns 잔여 수량 정보 (총 구매, 총 사용, 현재 잔여)
   * @throws {ApiError} 네트워크 에러, 서버 에러
   *
   * @example
   * const balance = await transactionApi.getBalance();
   * console.log(balance.current_balance); // 63
   */
  getBalance: async (): Promise<Balance> => {
    return apiClient.get<never, Balance>('/transactions/balance');
  },

  /**
   * 특정 사용자의 거래 내역 조회
   *
   * GET /api/transactions/user/:name
   *
   * @param userName - 조회할 사용자 이름
   * @returns 해당 사용자의 거래 내역 배열 (최신순 정렬)
   * @throws {ApiError} 네트워크 에러, 서버 에러
   *
   * @example
   * const transactions = await transactionApi.getUserTransactions('홍길동');
   * console.log(transactions.filter(t => t.type === 'purchase').length); // 구매 횟수
   */
  getUserTransactions: async (userName: string): Promise<Transaction[]> => {
    // 사용자 이름을 URL 인코딩하여 특수문자 처리
    const encodedName = encodeURIComponent(userName);
    return apiClient.get<never, Transaction[]>(`/transactions/user/${encodedName}`);
  },
};

/**
 * Transaction API 타입 (테스트 및 타입 추론용)
 */
export type TransactionApiType = typeof transactionApi;
