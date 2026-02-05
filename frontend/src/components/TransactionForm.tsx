import React, { useState } from 'react';
import { useTransaction } from '../hooks/useTransaction';
import { validateUserName, validateQuantity } from '../utils/validation';

interface TransactionFormProps {
  onSuccess: () => void;
}

/**
 * 주차권 거래 입력 폼 컴포넌트
 *
 * 당위성:
 * - 사용자 이름, 거래 유형(구매/사용), 수량을 입력받아 서버에 전송합니다.
 * - 클라이언트 측 검증을 통해 잘못된 입력을 사전에 차단하여 UX를 향상시킵니다.
 * - 명확한 피드백(로딩, 에러, 성공)을 제공하여 사용자가 현재 상태를 이해할 수 있습니다.
 */
export const TransactionForm: React.FC<TransactionFormProps> = ({ onSuccess }) => {
  const [userName, setUserName] = useState('');
  const [type, setType] = useState<'purchase' | 'use'>('purchase');
  const [quantity, setQuantity] = useState('');
  const [errors, setErrors] = useState<{ userName?: string; quantity?: string }>({});

  const { createTransaction, loading } = useTransaction();

  /**
   * 폼 검증 로직
   * 클라이언트 측에서 1차 검증을 수행하여 서버 부담을 줄입니다.
   */
  const validateForm = (): boolean => {
    const newErrors: { userName?: string; quantity?: string } = {};

    const userNameError = validateUserName(userName);
    if (userNameError) {
      newErrors.userName = userNameError;
    }

    const quantityError = validateQuantity(quantity);
    if (quantityError) {
      newErrors.quantity = quantityError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 검증 실패 시 제출 중단
    if (!validateForm()) {
      return;
    }

    // 서버에 거래 생성 요청
    const success = await createTransaction({
      userName: userName.trim(),
      type,
      quantity: parseInt(quantity, 10),
    });

    if (success) {
      // 성공 시 폼 초기화
      setUserName('');
      setQuantity('');
      setErrors({});
      onSuccess();
    }
  };

  /**
   * 입력 필드 변경 시 에러 제거
   */
  const handleUserNameChange = (value: string) => {
    setUserName(value);
    if (errors.userName) {
      setErrors({ ...errors, userName: undefined });
    }
  };

  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    if (errors.quantity) {
      setErrors({ ...errors, quantity: undefined });
    }
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-800 mb-6">주차권 관리</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 사용자 이름 입력 */}
        <div>
          <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
            사용자 이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="userName"
            value={userName}
            onChange={(e) => handleUserNameChange(e.target.value)}
            placeholder="예: 김철수"
            className={`w-full ${errors.userName ? 'border-red-500 focus:ring-red-500' : ''}`}
            disabled={loading}
          />
          {errors.userName && (
            <p className="mt-1 text-sm text-red-600">{errors.userName}</p>
          )}
        </div>

        {/* 거래 유형 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            거래 유형 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('purchase')}
              disabled={loading}
              className={`py-3 px-4 rounded-lg font-medium transition-all ${
                type === 'purchase'
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              🛒 구매
            </button>
            <button
              type="button"
              onClick={() => setType('use')}
              disabled={loading}
              className={`py-3 px-4 rounded-lg font-medium transition-all ${
                type === 'use'
                  ? 'bg-orange-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              🚗 사용
            </button>
          </div>
        </div>

        {/* 수량 입력 */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
            수량 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="quantity"
            value={quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            placeholder="1 ~ 10000"
            min="1"
            max="10000"
            className={`w-full ${errors.quantity ? 'border-red-500 focus:ring-red-500' : ''}`}
            disabled={loading}
          />
          {errors.quantity && (
            <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">1개부터 10,000개까지 입력 가능합니다.</p>
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-medium shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <div className="spinner w-5 h-5 mr-2"></div>
              처리 중...
            </span>
          ) : (
            <span>{type === 'purchase' ? '구매 기록' : '사용 기록'}</span>
          )}
        </button>
      </form>
    </div>
  );
};
