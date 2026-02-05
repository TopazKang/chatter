-- Migration: 001_create_transactions_table
-- Description: 주차권 거래 테이블 생성
-- Author: 백엔드 개발자
-- Date: 2024-02-05

-- ============================================
-- UP Migration (테이블 생성)
-- ============================================

-- 트랜잭션 테이블 생성
-- 주차권 구매(purchase)와 사용(use) 내역을 모두 기록
CREATE TABLE IF NOT EXISTS transactions (
    -- 기본키: 자동 증가 정수 (SERIAL = INTEGER + AUTO_INCREMENT)
    id SERIAL PRIMARY KEY,

    -- 사용자 이름: 최대 100자, 필수 입력
    -- 한글 이름(3-5자), 영문 이름(15-30자) 모두 수용 가능
    user_name VARCHAR(100) NOT NULL,

    -- 거래 유형: 'purchase'(구매) 또는 'use'(사용)
    -- CHECK 제약조건으로 허용된 값만 저장 (오타 방지)
    type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'use')),

    -- 수량: 양의 정수만 허용 (음수 및 0 방지)
    -- 주차권은 최소 1개 이상이어야 의미 있음
    quantity INTEGER NOT NULL CHECK (quantity > 0),

    -- 생성 시각: 거래 발생 시점 자동 기록
    -- 감사 추적(Audit Trail) 및 시간순 정렬에 사용
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 테이블 설명 추가 (문서화)
-- ============================================

COMMENT ON TABLE transactions IS '주차권 거래 내역 테이블 (구매/사용 통합)';
COMMENT ON COLUMN transactions.id IS '거래 고유 식별자 (자동 증가)';
COMMENT ON COLUMN transactions.user_name IS '직원 이름 (최대 100자)';
COMMENT ON COLUMN transactions.type IS '거래 유형 (purchase: 구매, use: 사용)';
COMMENT ON COLUMN transactions.quantity IS '주차권 수량 (양수만 허용)';
COMMENT ON COLUMN transactions.created_at IS '거래 발생 시각 (자동 기록)';

-- ============================================
-- DOWN Migration (롤백)
-- ============================================

-- 롤백 시 테이블 삭제
-- DROP TABLE IF EXISTS transactions CASCADE;
