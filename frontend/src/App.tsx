import React, { useEffect } from 'react';
import { TransactionForm } from './components/TransactionForm';
import { BalanceDisplay } from './components/BalanceDisplay';
import { TransactionList } from './components/TransactionList';
import { useBalance } from './hooks/useBalance';
import { useToast } from './hooks/useToast';
import { Toast } from './components/Toast';

/**
 * 메인 애플리케이션 컴포넌트
 *
 * 당위성:
 * - 단일 페이지 애플리케이션(SPA) 구조로 사용자 경험을 최적화합니다.
 * - 컴포넌트 기반 아키텍처로 각 기능을 명확히 분리합니다.
 * - 실시간 데이터 동기화를 통해 주차권 잔액을 즉시 반영합니다.
 */
function App() {
  const { balance, loading, error, fetchBalance } = useBalance();
  const { toasts } = useToast();

  // 초기 로딩 시 잔액 조회
  useEffect(() => {
    fetchBalance();
  }, []);

  /**
   * 거래 성공 시 호출되는 콜백
   * 잔액을 다시 조회하여 UI를 업데이트합니다.
   */
  const handleTransactionSuccess = () => {
    fetchBalance();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            🚗 회사 주차 관리 서비스
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            주차권 구매 및 사용 내역을 편리하게 관리하세요
          </p>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 좌측: 잔액 표시 */}
          <div className="lg:col-span-1">
            <BalanceDisplay
              balance={balance}
              loading={loading}
              error={error}
              onRefresh={fetchBalance}
            />
          </div>

          {/* 우측: 거래 입력 폼 */}
          <div className="lg:col-span-2">
            <TransactionForm onSuccess={handleTransactionSuccess} />
          </div>
        </div>

        {/* 거래 내역 목록 */}
        <div className="mt-8">
          <TransactionList />
        </div>
      </main>

      {/* Toast 알림 */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            © 2024 회사 주차 관리 서비스. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
