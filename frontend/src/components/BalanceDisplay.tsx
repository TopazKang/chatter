import React from 'react';
import { Balance } from '../types';

interface BalanceDisplayProps {
  balance: Balance | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/**
 * 잔여 주차권 수량 표시 컴포넌트
 *
 * 당위성:
 * - 전체 직원의 주차권 잔액을 한눈에 파악할 수 있도록 시각화합니다.
 * - 로딩 상태와 에러 상태를 명확히 표시하여 사용자 경험을 향상시킵니다.
 * - 새로고침 기능을 제공하여 최신 데이터를 즉시 확인할 수 있습니다.
 */
export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  balance,
  loading,
  error,
  onRefresh,
}) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">전체 잔여 수량</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          title="새로고침"
        >
          <svg
            className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* 로딩 상태 */}
      {loading && !balance && (
        <div className="flex items-center justify-center py-12">
          <div className="spinner w-12 h-12"></div>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-red-600 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* 잔액 표시 */}
      {balance && !loading && (
        <div className="space-y-4">
          {/* 주요 잔액 */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
            <p className="text-sm opacity-90 mb-2">현재 잔여 주차권</p>
            <p className="text-5xl font-bold mb-1">{balance.balance.toLocaleString()}</p>
            <p className="text-sm opacity-75">개</p>
          </div>

          {/* 상세 정보 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 총 구매 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-xs text-green-600 font-medium mb-1">총 구매</p>
              <p className="text-2xl font-bold text-green-700">
                {balance.totalPurchased.toLocaleString()}
              </p>
            </div>

            {/* 총 사용 */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-xs text-orange-600 font-medium mb-1">총 사용</p>
              <p className="text-2xl font-bold text-orange-700">
                {balance.totalUsed.toLocaleString()}
              </p>
            </div>
          </div>

          {/* 상태 메시지 */}
          <div className="text-center text-sm text-gray-500">
            <p>마지막 업데이트: {new Date().toLocaleTimeString('ko-KR')}</p>
          </div>
        </div>
      )}
    </div>
  );
};
