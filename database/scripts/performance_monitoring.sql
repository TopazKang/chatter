-- ============================================
-- 성능 모니터링 및 헬스 체크 쿼리 모음
-- ============================================
-- Project: 회사 주차 관리 서비스
-- Author: 백엔드 개발자 (시니어)
-- Date: 2024-02-05
--
-- 설명:
--   데이터베이스 성능 모니터링, 헬스 체크, 문제 진단을 위한 쿼리 모음
--   프로덕션 환경에서 주기적으로 실행하여 성능 저하 조기 발견
-- ============================================

-- ============================================
-- 1. 기본 헬스 체크
-- ============================================

-- 1.1 데이터베이스 연결 상태 확인
SELECT
    COUNT(*) as active_connections,
    MAX(pg_database.datname) as database_name,
    NOW() as check_time
FROM pg_stat_activity
WHERE pg_stat_activity.datname = current_database();

-- 1.2 테이블 크기 확인 (디스크 사용량)
SELECT
    'transactions' as table_name,
    pg_size_pretty(pg_total_relation_size('transactions')) AS total_size,
    pg_size_pretty(pg_relation_size('transactions')) AS table_size,
    pg_size_pretty(pg_total_relation_size('transactions') - pg_relation_size('transactions')) AS indexes_size,
    (SELECT COUNT(*) FROM transactions) as row_count
UNION ALL
SELECT
    'balance_view' as table_name,
    'N/A (View)' AS total_size,
    'N/A' AS table_size,
    'N/A' AS indexes_size,
    (SELECT COUNT(*) FROM balance_view) as row_count;

-- 1.3 데이터베이스 전체 크기
SELECT
    pg_database.datname AS database_name,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE pg_database.datname = current_database();

-- ============================================
-- 2. 인덱스 성능 분석
-- ============================================

-- 2.1 인덱스 사용 통계
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    CASE
        WHEN idx_scan = 0 THEN '⚠️ 미사용'
        WHEN idx_scan < 100 THEN '🟡 저사용'
        ELSE '✅ 정상'
    END as status
FROM pg_stat_user_indexes
WHERE tablename = 'transactions'
ORDER BY idx_scan DESC;

-- 2.2 사용되지 않는 인덱스 찾기
-- (idx_scan = 0인 인덱스는 삭제 고려)
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    '삭제 검토 필요' as recommendation
FROM pg_stat_user_indexes
WHERE tablename = 'transactions'
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey'; -- PRIMARY KEY는 제외

-- 2.3 인덱스 블로트(Bloat) 확인
-- (인덱스 크기가 비정상적으로 큰 경우 REINDEX 필요)
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS current_size,
    idx_scan as scan_count,
    CASE
        WHEN pg_relation_size(indexrelid) > 10485760 THEN '⚠️ REINDEX 고려 (10MB 이상)'
        ELSE '✅ 정상'
    END as recommendation
FROM pg_stat_user_indexes
WHERE tablename = 'transactions';

-- ============================================
-- 3. 쿼리 성능 분석
-- ============================================

-- 3.1 balance_view 쿼리 성능 측정
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM balance_view;

-- 3.2 user_balance_view 쿼리 성능 측정 (특정 사용자)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM user_balance_view WHERE user_name = '김철수';

-- 3.3 최근 거래 조회 쿼리 성능 측정
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM transactions
ORDER BY created_at DESC
LIMIT 20;

-- 3.4 사용자별 거래 조회 쿼리 성능 측정
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM transactions
WHERE user_name = '김철수'
ORDER BY created_at DESC;

-- ============================================
-- 4. 테이블 통계 정보
-- ============================================

-- 4.1 테이블 상세 통계
SELECT
    schemaname,
    tablename,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename = 'transactions';

-- 4.2 Dead Rows 확인 (VACUUM 필요 여부)
SELECT
    schemaname,
    tablename,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_ratio,
    CASE
        WHEN n_dead_tup > 10000 OR (100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0)) > 20 THEN '⚠️ VACUUM 필요'
        ELSE '✅ 정상'
    END as recommendation
FROM pg_stat_user_tables
WHERE tablename = 'transactions';

-- ============================================
-- 5. 연결 및 세션 모니터링
-- ============================================

-- 5.1 현재 활성 연결 수
SELECT
    COUNT(*) as total_connections,
    COUNT(*) FILTER (WHERE state = 'active') as active_connections,
    COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
    COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname = current_database();

-- 5.2 장기 실행 쿼리 찾기 (1분 이상)
SELECT
    pid,
    usename,
    state,
    query,
    NOW() - query_start AS duration
FROM pg_stat_activity
WHERE state = 'active'
  AND NOW() - query_start > INTERVAL '1 minute'
  AND datname = current_database()
ORDER BY duration DESC;

-- 5.3 블로킹 쿼리 확인 (데드락 진단)
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- ============================================
-- 6. 캐시 및 버퍼 통계
-- ============================================

-- 6.1 테이블 캐시 히트율 (높을수록 좋음, 95% 이상 권장)
SELECT
    schemaname,
    tablename,
    heap_blks_read AS disk_reads,
    heap_blks_hit AS cache_hits,
    CASE
        WHEN (heap_blks_hit + heap_blks_read) = 0 THEN 0
        ELSE ROUND(100.0 * heap_blks_hit / NULLIF(heap_blks_hit + heap_blks_read, 0), 2)
    END AS cache_hit_ratio,
    CASE
        WHEN ROUND(100.0 * heap_blks_hit / NULLIF(heap_blks_hit + heap_blks_read, 0), 2) >= 95 THEN '✅ 우수'
        WHEN ROUND(100.0 * heap_blks_hit / NULLIF(heap_blks_hit + heap_blks_read, 0), 2) >= 80 THEN '🟡 보통'
        ELSE '⚠️ 개선 필요'
    END as status
FROM pg_statio_user_tables
WHERE tablename = 'transactions';

-- 6.2 인덱스 캐시 히트율
SELECT
    schemaname,
    tablename,
    indexname,
    idx_blks_read AS disk_reads,
    idx_blks_hit AS cache_hits,
    CASE
        WHEN (idx_blks_hit + idx_blks_read) = 0 THEN 0
        ELSE ROUND(100.0 * idx_blks_hit / NULLIF(idx_blks_hit + idx_blks_read, 0), 2)
    END AS cache_hit_ratio
FROM pg_statio_user_indexes
WHERE tablename = 'transactions'
ORDER BY cache_hit_ratio DESC;

-- ============================================
-- 7. 비즈니스 메트릭 (도메인 특화)
-- ============================================

-- 7.1 시간대별 거래 분포 (피크 타임 분석)
SELECT
    EXTRACT(HOUR FROM created_at) AS hour,
    COUNT(*) AS transaction_count,
    SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) AS total_purchased,
    SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END) AS total_used
FROM transactions
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;

-- 7.2 일별 거래 추이 (최근 7일)
SELECT
    DATE(created_at) AS date,
    COUNT(*) AS transaction_count,
    COUNT(DISTINCT user_name) AS active_users,
    SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) AS daily_purchased,
    SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END) AS daily_used
FROM transactions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 7.3 활성 사용자 랭킹 (거래 빈도 기준)
SELECT
    user_name,
    COUNT(*) AS transaction_count,
    SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) AS total_purchased,
    SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END) AS total_used,
    MAX(created_at) AS last_activity
FROM transactions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_name
ORDER BY transaction_count DESC
LIMIT 10;

-- 7.4 잔액 분포 분석
SELECT
    CASE
        WHEN balance = 0 THEN '0개 (소진)'
        WHEN balance BETWEEN 1 AND 5 THEN '1-5개 (부족)'
        WHEN balance BETWEEN 6 AND 10 THEN '6-10개 (보통)'
        WHEN balance BETWEEN 11 AND 20 THEN '11-20개 (여유)'
        ELSE '21개 이상 (충분)'
    END as balance_range,
    COUNT(*) as user_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM user_balance_view
GROUP BY balance_range
ORDER BY MIN(balance);

-- ============================================
-- 8. 종합 헬스 체크 리포트
-- ============================================

-- 한 번의 쿼리로 전체 상태 확인
SELECT
    'Database Health Check' AS report_name,
    NOW() AS check_time,
    current_database() AS database_name,
    (SELECT COUNT(*) FROM transactions) AS total_transactions,
    (SELECT COUNT(DISTINCT user_name) FROM transactions) AS total_users,
    (SELECT balance FROM balance_view) AS current_balance,
    pg_size_pretty(pg_database_size(current_database())) AS database_size,
    (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database()) AS active_connections,
    (SELECT ROUND(100.0 * heap_blks_hit / NULLIF(heap_blks_hit + heap_blks_read, 0), 2)
     FROM pg_statio_user_tables WHERE tablename = 'transactions') AS cache_hit_ratio,
    (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE tablename = 'transactions' AND idx_scan = 0) AS unused_indexes;

-- ============================================
-- 9. 유지보수 명령어
-- ============================================

-- 실행 시 주의: 프로덕션 환경에서는 저사용 시간대에 실행

-- 9.1 통계 정보 업데이트 (쿼리 성능 개선)
-- ANALYZE transactions;

-- 9.2 테이블 청소 (Dead Rows 제거)
-- VACUUM transactions;

-- 9.3 전체 VACUUM (디스크 공간 회수)
-- VACUUM FULL transactions;

-- 9.4 인덱스 재구성 (블로트 제거)
-- REINDEX TABLE transactions;

-- 9.5 특정 인덱스 재구성
-- REINDEX INDEX idx_transactions_user_name;

-- ============================================
-- 10. 알림 설정 (pg_cron 또는 외부 모니터링 도구 사용)
-- ============================================

-- 예시: 잔액이 10개 미만일 때 알림
-- SELECT
--     balance,
--     CASE
--         WHEN balance < 10 THEN '⚠️ 주차권 부족 알림: ' || balance || '개 남음'
--         ELSE '✅ 정상'
--     END as alert_message
-- FROM balance_view;

-- 예시: Dead Rows가 20% 이상일 때 알림
-- SELECT
--     CASE
--         WHEN (100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0)) > 20
--         THEN '⚠️ VACUUM 필요: Dead Rows ' || ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) || '%'
--         ELSE '✅ 정상'
--     END as alert_message
-- FROM pg_stat_user_tables
-- WHERE tablename = 'transactions';

-- ============================================
-- 사용 방법
-- ============================================

-- 1. 일일 모니터링: 섹션 1, 2, 7, 8 실행
-- 2. 주간 점검: 전체 섹션 실행
-- 3. 성능 저하 시: 섹션 3, 4, 5, 6 실행
-- 4. 유지보수: 섹션 9 실행 (저사용 시간대)

-- ============================================
-- 참고 사항
-- ============================================

-- - pg_stat_statements 확장 활성화 시 더 상세한 쿼리 통계 확인 가능
-- - 프로덕션 환경에서는 pgAdmin, DataDog, CloudWatch 등 모니터링 도구 활용 권장
-- - 자동화된 알림은 pg_cron, AWS Lambda, Kubernetes CronJob 등으로 구현
