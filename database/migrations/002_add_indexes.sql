-- Migration: 002_add_indexes
-- Description: 성능 최적화를 위한 인덱스 생성
-- Author: 백엔드 개발자
-- Date: 2024-02-05

-- ============================================
-- UP Migration (인덱스 생성)
-- ============================================

-- 인덱스 1: user_name 필드
-- 목적: 특정 사용자의 거래 내역 조회 최적화
-- 쿼리 예시: SELECT * FROM transactions WHERE user_name = '김철수';
-- 성능 향상: O(n) → O(log n) (전체 스캔 → B-Tree 탐색)
CREATE INDEX IF NOT EXISTS idx_transactions_user_name
ON transactions(user_name);

COMMENT ON INDEX idx_transactions_user_name IS '사용자별 거래 조회 최적화 (user_name 검색)';

-- 인덱스 2: created_at 필드 (내림차순)
-- 목적: 최근 거래 내역 조회 최적화 (시간순 정렬)
-- 쿼리 예시: SELECT * FROM transactions ORDER BY created_at DESC LIMIT 20;
-- DESC 인덱스 이유: 대부분의 조회가 최신 데이터부터 시작
CREATE INDEX IF NOT EXISTS idx_transactions_created_at
ON transactions(created_at DESC);

COMMENT ON INDEX idx_transactions_created_at IS '최근 거래 조회 최적화 (시간순 내림차순 정렬)';

-- 인덱스 3: type 필드
-- 목적: 거래 타입별 집계 및 필터링 최적화
-- 쿼리 예시:
--   - SELECT * FROM transactions WHERE type = 'purchase';
--   - SELECT type, COUNT(*), SUM(quantity) FROM transactions GROUP BY type;
-- 낮은 카디널리티(Low Cardinality): 값이 2개('purchase', 'use')뿐이지만
-- 집계 쿼리에서 WHERE 절 필터링 시 성능 향상 효과 있음
CREATE INDEX IF NOT EXISTS idx_transactions_type
ON transactions(type);

COMMENT ON INDEX idx_transactions_type IS '거래 타입별 집계/필터링 최적화 (purchase/use 구분)';

-- ============================================
-- 인덱스 효율성 검증 쿼리
-- ============================================

-- 인덱스가 실제로 사용되는지 확인 (개발 환경에서 실행)
-- EXPLAIN ANALYZE SELECT * FROM transactions WHERE user_name = '김철수';
-- EXPLAIN ANALYZE SELECT * FROM transactions ORDER BY created_at DESC LIMIT 20;
-- EXPLAIN ANALYZE SELECT * FROM transactions WHERE type = 'purchase';

-- 인덱스 크기 확인
-- SELECT pg_size_pretty(pg_relation_size('idx_transactions_user_name')) AS index_size;

-- ============================================
-- DOWN Migration (롤백)
-- ============================================

-- 롤백 시 인덱스 삭제
-- DROP INDEX IF EXISTS idx_transactions_user_name;
-- DROP INDEX IF EXISTS idx_transactions_created_at;
-- DROP INDEX IF EXISTS idx_transactions_type;
