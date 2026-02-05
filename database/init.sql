-- ============================================
-- 주차 관리 서비스 데이터베이스 초기화 스크립트
-- ============================================
-- Project: 회사 주차 관리 서비스
-- Database: parking_management
-- Author: 백엔드 개발자 (시니어)
-- Version: 1.0.0
-- Date: 2024-02-05
--
-- Description:
--   Docker Compose 환경에서 PostgreSQL 컨테이너 초기화 시 자동 실행되는 스크립트
--   /docker-entrypoint-initdb.d/ 디렉토리에 마운트되어 실행됨
--
-- 실행 순서:
--   1. 트랜잭션 테이블 생성 (migrations/001)
--   2. 인덱스 생성 (migrations/002)
--   3. 뷰 생성 (migrations/003)
--   4. 샘플 데이터 삽입 (seeds/001) - 개발 환경만
-- ============================================

-- 트랜잭션 시작 (원자성 보장)
BEGIN;

-- ============================================
-- Step 1: 트랜잭션 테이블 생성
-- ============================================

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

-- 테이블 설명 추가 (문서화)
COMMENT ON TABLE transactions IS '주차권 거래 내역 테이블 (구매/사용 통합)';
COMMENT ON COLUMN transactions.id IS '거래 고유 식별자 (자동 증가)';
COMMENT ON COLUMN transactions.user_name IS '직원 이름 (최대 100자)';
COMMENT ON COLUMN transactions.type IS '거래 유형 (purchase: 구매, use: 사용)';
COMMENT ON COLUMN transactions.quantity IS '주차권 수량 (양수만 허용)';
COMMENT ON COLUMN transactions.created_at IS '거래 발생 시각 (자동 기록)';

-- ============================================
-- Step 2: 성능 최적화 인덱스 생성
-- ============================================

-- 인덱스 1: user_name 필드 - 특정 사용자의 거래 내역 조회 최적화
CREATE INDEX IF NOT EXISTS idx_transactions_user_name ON transactions(user_name);
COMMENT ON INDEX idx_transactions_user_name IS '사용자별 거래 조회 최적화 (user_name 검색)';

-- 인덱스 2: created_at 필드 (내림차순) - 최근 거래 내역 조회 최적화
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
COMMENT ON INDEX idx_transactions_created_at IS '최근 거래 조회 최적화 (시간순 내림차순 정렬)';

-- 인덱스 3: type 필드 - 거래 타입별 집계 및 필터링 최적화
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
COMMENT ON INDEX idx_transactions_type IS '거래 타입별 집계/필터링 최적화 (purchase/use 구분)';

-- ============================================
-- Step 3: 집계 뷰 생성
-- ============================================

-- 뷰 1: balance_view - 전체 잔여 수량 조회
-- 목적: 모든 직원의 주차권을 합산하여 전체 잔여 수량 계산
CREATE OR REPLACE VIEW balance_view AS
SELECT
    COALESCE(SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END), 0) AS total_purchased,
    COALESCE(SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END), 0) AS total_used,
    COALESCE(
        SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) -
        SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END), 0
    ) AS balance
FROM transactions;

COMMENT ON VIEW balance_view IS '전체 주차권 잔여 수량 조회 (1행 반환)';

-- 뷰 2: user_balance_view - 사용자별 잔여 수량 조회
-- 목적: 각 직원의 개별 주차권 잔액 계산
CREATE OR REPLACE VIEW user_balance_view AS
SELECT
    user_name,
    COALESCE(SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END), 0) AS purchased,
    COALESCE(SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END), 0) AS used,
    COALESCE(
        SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) -
        SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END), 0
    ) AS balance
FROM transactions
GROUP BY user_name;

COMMENT ON VIEW user_balance_view IS '사용자별 주차권 잔여 수량 조회 (사용자별 1행)';

-- ============================================
-- Step 4: 샘플 데이터 삽입 (개발 환경만)
-- ============================================

-- 기본 샘플 데이터 (최소한의 데이터)
-- 더 많은 테스트 데이터는 seeds/001_sample_transactions.sql 참고
INSERT INTO transactions (user_name, type, quantity, created_at) VALUES
    ('김철수', 'purchase', 10, '2024-02-01 09:00:00'),
    ('이영희', 'purchase', 15, '2024-02-01 10:15:00'),
    ('박민수', 'purchase', 8, '2024-02-01 11:30:00'),
    ('김철수', 'use', 3, '2024-02-02 08:30:00'),
    ('이영희', 'use', 5, '2024-02-03 09:00:00');

-- ============================================
-- Step 5: 통계 정보 업데이트
-- ============================================

-- 쿼리 플래너가 최적의 실행 계획을 세울 수 있도록 통계 수집
ANALYZE transactions;

-- ============================================
-- 완료 메시지 및 검증
-- ============================================

DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    view_count INTEGER;
    record_count INTEGER;
BEGIN
    -- 테이블 확인
    SELECT COUNT(*) INTO table_count
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'transactions';

    -- 인덱스 확인
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'transactions';

    -- 뷰 확인
    SELECT COUNT(*) INTO view_count
    FROM pg_views
    WHERE schemaname = 'public' AND viewname IN ('balance_view', 'user_balance_view');

    -- 레코드 확인
    SELECT COUNT(*) INTO record_count FROM transactions;

    -- 결과 출력
    RAISE NOTICE '========================================';
    RAISE NOTICE '주차 관리 데이터베이스 초기화 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ 테이블: % 개 (transactions)', table_count;
    RAISE NOTICE '✓ 인덱스: % 개 (PK + 3개 인덱스)', index_count;
    RAISE NOTICE '✓ 뷰: % 개 (balance_view, user_balance_view)', view_count;
    RAISE NOTICE '✓ 샘플 데이터: % 건', record_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '사용 가능한 엔드포인트:';
    RAISE NOTICE '  POST   /api/transactions';
    RAISE NOTICE '  GET    /api/transactions';
    RAISE NOTICE '  GET    /api/transactions/balance';
    RAISE NOTICE '  GET    /api/transactions/user/:name';
    RAISE NOTICE '========================================';
END $$;

-- 트랜잭션 커밋
COMMIT;

-- ============================================
-- 검증 쿼리 (개발자 참고용)
-- ============================================

-- 아래 쿼리들은 주석 처리되어 있으며, 필요 시 수동 실행

-- 1. 테이블 구조 확인
-- \d transactions

-- 2. 인덱스 목록 확인
-- \di

-- 3. 뷰 목록 확인
-- \dv

-- 4. 전체 잔액 조회
-- SELECT * FROM balance_view;

-- 5. 사용자별 잔액 조회
-- SELECT * FROM user_balance_view ORDER BY balance DESC;

-- 6. 최근 거래 내역 조회
-- SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;

-- 7. 테이블 크기 확인
-- SELECT pg_size_pretty(pg_total_relation_size('transactions')) AS table_size;

-- 8. 인덱스 크기 확인
-- SELECT
--     indexname,
--     pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
-- FROM pg_stat_user_indexes
-- WHERE tablename = 'transactions';

-- ============================================
-- 추가 정보
-- ============================================

-- 마이그레이션 파일:
--   - database/migrations/001_create_transactions_table.sql
--   - database/migrations/002_add_indexes.sql
--   - database/migrations/003_create_views.sql

-- 시드 데이터 파일:
--   - database/seeds/001_sample_transactions.sql (더 많은 테스트 데이터)

-- 설계 문서:
--   - DATABASE_DESIGN.md (상세 설계 근거 및 최적화 전략)
