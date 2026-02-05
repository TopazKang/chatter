/**
 * useToast 커스텀 훅
 *
 * 토스트 알림 메시지 표시 및 관리
 *
 * 제공 기능:
 * - 성공/에러/정보 메시지 표시
 * - 자동 사라짐
 * - 수동 닫기
 * - 여러 토스트 동시 표시 지원
 *
 * @example
 * const { showToast, toasts } = useToast();
 *
 * const handleSuccess = () => {
 *   showToast('거래가 성공적으로 완료되었습니다!', 'success');
 * };
 */

import { useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  /** 고유 ID */
  id: string;

  /** 메시지 내용 */
  message: string;

  /** 토스트 유형 */
  type: ToastType;

  /** 표시 시간 (ms) */
  duration?: number;
}

interface UseToastReturn {
  /** 현재 토스트 목록 */
  toasts: ToastItem[];

  /** 토스트 표시 함수 */
  showToast: (message: string, type?: ToastType, duration?: number) => void;

  /** 토스트 숨기기 함수 */
  hideToast: (id: string) => void;
}

/**
 * useToast 훅
 *
 * @param defaultDuration - 기본 표시 시간 (ms, 기본: 3000)
 * @returns 토스트 관련 상태 및 함수
 */
export const useToast = (defaultDuration: number = 3000): UseToastReturn => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timerRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * 토스트 숨기기
   */
  const hideToast = useCallback((id: string) => {
    // 해당 토스트 타이머 제거
    const timer = timerRefs.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerRefs.current.delete(id);
    }

    // 토스트 제거
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * 토스트 표시
   *
   * @param message - 표시할 메시지
   * @param type - 토스트 유형 (기본: 'info')
   * @param duration - 표시 시간 (ms, 기본: defaultDuration)
   */
  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = defaultDuration) => {
      // 고유 ID 생성
      const id = `toast-${Date.now()}-${Math.random()}`;

      // 새 토스트 추가
      const newToast: ToastItem = {
        id,
        message,
        type,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      // 자동으로 숨기기
      if (duration > 0) {
        const timer = setTimeout(() => {
          hideToast(id);
        }, duration);
        timerRefs.current.set(id, timer);
      }
    },
    [defaultDuration, hideToast]
  );

  return {
    toasts,
    showToast,
    hideToast,
  };
};
