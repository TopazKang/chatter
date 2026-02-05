-- Migration: 003_create_views
-- Description: 잔여 수량 조회를 위한 뷰(View) 생성
-- Author: 백엔드 개발자
-- Date: 2024-02-05

-- ============================================
-- UP Migration (뷰 생성)
-- ============================================

-- 뷰 1: balance_view - 전체 잔여 수량 조회
-- 목적: 모든 직원의 주차권을 합산하여 전체 잔여 수량 계산
-- 반환: 1개 행 (총 구매, 총 사용, 잔여 수량)
CREATE OR REPLACE VIEW balance_view AS
SELECT
    -- 총 구매 수량 (type = 'purchase'인 행만 합산)
    -- COALESCE: 거래가 없을 때 NULL 대신 0 반환
    COALESCE(
        SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END),
        0
    ) AS total_purchased,

    -- 총 사용 수량 (type = 'use'인 행만 합산)
    COALESCE(
        SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END),
        0
    ) AS total_used,

    -- 잔여 수량 (구매 - 사용)
    COALESCE(
        SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) -
        SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END),
        0
    ) AS balance
FROM transactions;

COMMENT ON VIEW balance_view IS '전체 주차권 잔여 수량 조회 (1행 반환)';

-- 사용 예시:
-- SELECT * FROM balance_view;
--
-- 예상 결과:
-- total_purchased | total_used | balance
-- ----------------|------------|--------
--      100        |     45     |   55

-- ============================================

-- 뷰 2: user_balance_view - 사용자별 잔여 수량 조회
-- 목적: 각 직원의 개별 주차권 잔액 계산
-- 반환: N개 행 (사용자 수만큼)
CREATE OR REPLACE VIEW user_balance_view AS
SELECT
    -- 사용자 이름 (그룹화 기준)
    user_name,

    -- 사용자별 구매 수량
    COALESCE(
        SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END),
        0
    ) AS purchased,

    -- 사용자별 사용 수량
    COALESCE(
        SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END),
        0
    ) AS used,

    -- 사용자별 잔여 수량 (구매 - 사용)
    COALESCE(
        SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) -
        SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END),
        0
    ) AS balance
FROM transactions
GROUP BY user_name;

COMMENT ON VIEW user_balance_view IS '사용자별 주차권 잔여 수량 조회 (사용자별 1행)';

-- 사용 예시:
-- SELECT * FROM user_balance_view;
--
-- 예상 결과:
-- user_name | purchased | used | balance
-- ----------|-----------|------|--------
-- 김철수    |    10     |  3   |   7
-- 이영희    |    15     |  5   |  10
-- 박민수    |     8     |  0   |   8

-- 특정 사용자 조회:
-- SELECT * FROM user_balance_view WHERE user_name = '김철수';

-- 잔액이 부족한 사용자 찾기:
-- SELECT * FROM user_balance_view WHERE balance < 5 ORDER BY balance;

-- ============================================
-- 설계 근거
-- ============================================

-- 1. CASE WHEN 사용 이유:
--    - 조건부 집계: 타입에 따라 다르게 계산 (purchase는 더하고, use는 빼기)
--    - 단일 테이블 스캔: 한 번의 테이블 스캔으로 모든 집계 완료 (효율적)

-- 2. COALESCE 사용 이유:
--    - NULL 안전 처리: 거래가 하나도 없을 때 NULL 대신 0 반환
--    - 프론트엔드 간편화: 애플리케이션에서 NULL 체크 불필요

-- 3. 일반 View vs Materialized View:
--    현재 선택: 일반 View (실시간 계산)
--    - 장점: 항상 최신 데이터 보장 (주차권 잔액은 즉시 반영 필요)
--    - 단점: 매번 계산 오버헤드
--
--    향후 Materialized View 전환 고려 (데이터가 10만 건 이상일 때):
--    - CREATE MATERIALIZED VIEW balance_view_mat AS ...
--    - REFRESH MATERIALIZED VIEW CONCURRENTLY balance_view_mat;
--    - 주기적 갱신 (5초마다 또는 트리거 기반)

-- ============================================
-- 성능 테스트
-- ============================================

-- 뷰 성능 측정
-- EXPLAIN ANALYZE SELECT * FROM balance_view;
-- EXPLAIN ANALYZE SELECT * FROM user_balance_view WHERE user_name = '김철수';

-- 인덱스 활용 확인
-- idx_transactions_user_name 인덱스가 user_balance_view의 WHERE 절에서 사용됨
-- idx_transactions_type 인덱스가 CASE WHEN 필터링에서 사용됨

-- ============================================
-- DOWN Migration (롤백)
-- ============================================

-- 롤백 시 뷰 삭제
-- DROP VIEW IF EXISTS balance_view CASCADE;
-- DROP VIEW IF EXISTS user_balance_view CASCADE;
