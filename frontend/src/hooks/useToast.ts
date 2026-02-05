/**
 * useToast 커스텀 훅
 *
 * 토스트 알림 메시지 표시 및 관리
 *
 * 제공 기능:
 * - 성공/에러/정보 메시지 표시
 * - 자동 사라짐
 * - 수동 닫기
 *
 * @example
 * const { showToast, toast } = useToast();
 *
 * const handleSuccess = () => {
 *   showToast('거래가 성공적으로 완료되었습니다!', 'success');
 * };
 */

import { useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  /** 메시지 내용 */
  message: string;

  /** 토스트 유형 */
  type: ToastType;

  /** 표시 여부 */
  visible: boolean;
}

interface UseToastReturn {
  /** 현재 토스트 상태 */
  toast: Toast | null;

  /** 토스트 표시 함수 */
  showToast: (message: string, type?: ToastType, duration?: number) => void;

  /** 토스트 숨기기 함수 */
  hideToast: () => void;
}

/**
 * useToast 훅
 *
 * @param defaultDuration - 기본 표시 시간 (ms, 기본: 3000)
 * @returns 토스트 관련 상태 및 함수
 */
export const useToast = (defaultDuration: number = 3000): UseToastReturn => {
  const [toast, setToast] = useState<Toast | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 토스트 숨기기
   */
  const hideToast = useCallback(() => {
    setToast((prev) => (prev ? { ...prev, visible: false } : null));

    // 애니메이션 후 완전히 제거
    setTimeout(() => {
      setToast(null);
    }, 300);
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
      // 기존 타이머 제거
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // 새 토스트 표시
      setToast({
        message,
        type,
        visible: true,
      });

      // 자동으로 숨기기
      if (duration > 0) {
        timerRef.current = setTimeout(() => {
          hideToast();
        }, duration);
      }
    },
    [defaultDuration, hideToast]
  );

  return {
    toast,
    showToast,
    hideToast,
  };
};
