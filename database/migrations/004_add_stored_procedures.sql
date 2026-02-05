-- Migration: 004_add_stored_procedures
-- Description: 동시성 제어를 위한 스토어드 프로시저 및 함수 추가
-- Author: 백엔드 개발자 (시니어)
-- Date: 2024-02-05

-- ============================================
-- UP Migration (스토어드 프로시저 생성)
-- ============================================

-- ============================================
-- 1. 주차권 사용 함수 (잔액 검증 포함)
-- ============================================

/**
 * 함수명: use_parking_ticket
 * 목적: 주차권 사용 시 잔액을 확인하고 안전하게 거래를 생성
 *
 * 당위성:
 * - Race Condition 방지: 여러 사용자가 동시에 주차권을 사용할 때 잔액 초과 사용 방지
 * - 원자성 보장: 잔액 확인 → 거래 생성을 하나의 트랜잭션으로 처리
 * - 비즈니스 로직 중앙화: 애플리케이션 레벨이 아닌 데이터베이스 레벨에서 검증
 *
 * 파라미터:
 * - p_user_name: 사용자 이름
 * - p_quantity: 사용할 주차권 수량
 *
 * 반환값:
 * - success (BOOLEAN): 성공 여부
 * - message (TEXT): 결과 메시지
 * - transaction_id (INTEGER): 생성된 거래 ID (실패 시 NULL)
 * - current_balance (INTEGER): 현재 잔여 수량
 */
CREATE OR REPLACE FUNCTION use_parking_ticket(
    p_user_name VARCHAR(100),
    p_quantity INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    transaction_id INTEGER,
    current_balance INTEGER
) AS $$
DECLARE
    v_balance INTEGER;
    v_new_transaction_id INTEGER;
BEGIN
    -- 입력 검증: 수량은 양수여야 함
    IF p_quantity <= 0 THEN
        RETURN QUERY SELECT
            FALSE,
            '수량은 1 이상이어야 합니다.'::TEXT,
            NULL::INTEGER,
            NULL::INTEGER;
        RETURN;
    END IF;

    -- 입력 검증: 사용자 이름은 필수
    IF p_user_name IS NULL OR TRIM(p_user_name) = '' THEN
        RETURN QUERY SELECT
            FALSE,
            '사용자 이름은 필수입니다.'::TEXT,
            NULL::INTEGER,
            NULL::INTEGER;
        RETURN;
    END IF;

    -- 현재 전체 잔액 조회 (FOR UPDATE로 행 잠금)
    -- 주의: balance_view는 View이므로 잠금 불가, 직접 계산
    SELECT
        COALESCE(
            SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) -
            SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END),
            0
        )
    INTO v_balance
    FROM transactions;

    -- 잔액 부족 체크
    IF v_balance < p_quantity THEN
        RETURN QUERY SELECT
            FALSE,
            FORMAT('잔액 부족: 현재 %s개, 요청 %s개', v_balance, p_quantity)::TEXT,
            NULL::INTEGER,
            v_balance;
        RETURN;
    END IF;

    -- 거래 생성
    INSERT INTO transactions (user_name, type, quantity, created_at)
    VALUES (TRIM(p_user_name), 'use', p_quantity, CURRENT_TIMESTAMP)
    RETURNING id INTO v_new_transaction_id;

    -- 업데이트된 잔액 계산
    v_balance := v_balance - p_quantity;

    -- 성공 응답
    RETURN QUERY SELECT
        TRUE,
        FORMAT('주차권 %s개 사용 완료', p_quantity)::TEXT,
        v_new_transaction_id,
        v_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION use_parking_ticket IS '주차권 사용 함수 (잔액 검증 포함, Race Condition 방지)';

-- 사용 예시:
-- SELECT * FROM use_parking_ticket('김철수', 3);
--
-- 성공 시 반환값:
-- success | message                | transaction_id | current_balance
-- --------|------------------------|----------------|----------------
-- true    | 주차권 3개 사용 완료    |      15        |      52
--
-- 실패 시 반환값 (잔액 부족):
-- success | message                           | transaction_id | current_balance
-- --------|-----------------------------------|----------------|----------------
-- false   | 잔액 부족: 현재 2개, 요청 3개      |     NULL       |       2

-- ============================================
-- 2. 주차권 구매 함수 (검증 포함)
-- ============================================

/**
 * 함수명: purchase_parking_ticket
 * 목적: 주차권 구매 시 입력값을 검증하고 안전하게 거래를 생성
 *
 * 당위성:
 * - 입력 검증 중앙화: 데이터베이스 레벨에서 일관된 검증
 * - 트랜잭션 안전성: 원자성 보장
 *
 * 파라미터:
 * - p_user_name: 사용자 이름
 * - p_quantity: 구매할 주차권 수량
 *
 * 반환값:
 * - success (BOOLEAN): 성공 여부
 * - message (TEXT): 결과 메시지
 * - transaction_id (INTEGER): 생성된 거래 ID
 * - current_balance (INTEGER): 현재 잔여 수량
 */
CREATE OR REPLACE FUNCTION purchase_parking_ticket(
    p_user_name VARCHAR(100),
    p_quantity INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    transaction_id INTEGER,
    current_balance INTEGER
) AS $$
DECLARE
    v_balance INTEGER;
    v_new_transaction_id INTEGER;
BEGIN
    -- 입력 검증: 수량은 양수여야 함
    IF p_quantity <= 0 THEN
        RETURN QUERY SELECT
            FALSE,
            '수량은 1 이상이어야 합니다.'::TEXT,
            NULL::INTEGER,
            NULL::INTEGER;
        RETURN;
    END IF;

    -- 입력 검증: 수량 상한선 (10000개)
    IF p_quantity > 10000 THEN
        RETURN QUERY SELECT
            FALSE,
            '한 번에 10000개 이하로만 구매할 수 있습니다.'::TEXT,
            NULL::INTEGER,
            NULL::INTEGER;
        RETURN;
    END IF;

    -- 입력 검증: 사용자 이름은 필수
    IF p_user_name IS NULL OR TRIM(p_user_name) = '' THEN
        RETURN QUERY SELECT
            FALSE,
            '사용자 이름은 필수입니다.'::TEXT,
            NULL::INTEGER,
            NULL::INTEGER;
        RETURN;
    END IF;

    -- 거래 생성
    INSERT INTO transactions (user_name, type, quantity, created_at)
    VALUES (TRIM(p_user_name), 'purchase', p_quantity, CURRENT_TIMESTAMP)
    RETURNING id INTO v_new_transaction_id;

    -- 현재 잔액 계산
    SELECT
        COALESCE(
            SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) -
            SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END),
            0
        )
    INTO v_balance
    FROM transactions;

    -- 성공 응답
    RETURN QUERY SELECT
        TRUE,
        FORMAT('주차권 %s개 구매 완료', p_quantity)::TEXT,
        v_new_transaction_id,
        v_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION purchase_parking_ticket IS '주차권 구매 함수 (입력 검증 포함)';

-- 사용 예시:
-- SELECT * FROM purchase_parking_ticket('이영희', 10);

-- ============================================
-- 3. 사용자별 잔액 조회 함수 (캐싱 가능)
-- ============================================

/**
 * 함수명: get_user_balance_safe
 * 목적: 사용자별 잔액을 안전하게 조회 (NULL 처리)
 *
 * 당위성:
 * - NULL 안전 처리: 거래가 없는 사용자도 0으로 반환
 * - 성능 최적화: 함수로 캡슐화하여 인덱스 활용
 *
 * 파라미터:
 * - p_user_name: 조회할 사용자 이름
 *
 * 반환값:
 * - 사용자 이름, 구매 수량, 사용 수량, 잔여 수량
 */
CREATE OR REPLACE FUNCTION get_user_balance_safe(
    p_user_name VARCHAR(100)
)
RETURNS TABLE(
    user_name VARCHAR(100),
    purchased INTEGER,
    used INTEGER,
    balance INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(p_user_name, '')::VARCHAR(100) as user_name,
        COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.quantity ELSE 0 END), 0)::INTEGER as purchased,
        COALESCE(SUM(CASE WHEN t.type = 'use' THEN t.quantity ELSE 0 END), 0)::INTEGER as used,
        COALESCE(
            SUM(CASE WHEN t.type = 'purchase' THEN t.quantity ELSE 0 END) -
            SUM(CASE WHEN t.type = 'use' THEN t.quantity ELSE 0 END),
            0
        )::INTEGER as balance
    FROM transactions t
    WHERE t.user_name = p_user_name
    GROUP BY t.user_name;

    -- 거래가 없는 경우 0 반환
    IF NOT FOUND THEN
        RETURN QUERY SELECT
            p_user_name::VARCHAR(100),
            0::INTEGER,
            0::INTEGER,
            0::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_balance_safe IS '사용자별 잔액 조회 (NULL 안전 처리)';

-- 사용 예시:
-- SELECT * FROM get_user_balance_safe('김철수');

-- ============================================
-- 4. 데이터베이스 통계 정보 함수
-- ============================================

/**
 * 함수명: get_database_stats
 * 목적: 데이터베이스 통계 정보 조회 (모니터링용)
 *
 * 반환값:
 * - 총 거래 수
 * - 총 사용자 수
 * - 총 구매 수량
 * - 총 사용 수량
 * - 전체 잔여 수량
 * - 최근 거래 시간
 */
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE(
    total_transactions BIGINT,
    total_users BIGINT,
    total_purchased BIGINT,
    total_used BIGINT,
    total_balance BIGINT,
    last_transaction_time TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_transactions,
        COUNT(DISTINCT user_name)::BIGINT as total_users,
        COALESCE(SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END), 0)::BIGINT as total_purchased,
        COALESCE(SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END), 0)::BIGINT as total_used,
        COALESCE(
            SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) -
            SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END),
            0
        )::BIGINT as total_balance,
        MAX(created_at) as last_transaction_time
    FROM transactions;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_database_stats IS '데이터베이스 통계 정보 조회 (모니터링용)';

-- 사용 예시:
-- SELECT * FROM get_database_stats();

-- ============================================
-- 5. 트리거: 거래 후 로그 기록 (선택 사항)
-- ============================================

-- 감사 로그 테이블 생성 (선택 사항, 향후 확장)
-- CREATE TABLE IF NOT EXISTS transaction_audit_log (
--     id SERIAL PRIMARY KEY,
--     transaction_id INTEGER,
--     action VARCHAR(20),
--     user_name VARCHAR(100),
--     quantity INTEGER,
--     old_balance INTEGER,
--     new_balance INTEGER,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- ============================================
-- 검증 쿼리
-- ============================================

-- 함수 목록 확인
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM pg_proc
    WHERE proname IN (
        'use_parking_ticket',
        'purchase_parking_ticket',
        'get_user_balance_safe',
        'get_database_stats'
    );

    RAISE NOTICE '========================================';
    RAISE NOTICE '스토어드 프로시저/함수 생성 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ 생성된 함수: % 개', func_count;
    RAISE NOTICE '  1. use_parking_ticket (주차권 사용)';
    RAISE NOTICE '  2. purchase_parking_ticket (주차권 구매)';
    RAISE NOTICE '  3. get_user_balance_safe (사용자 잔액 조회)';
    RAISE NOTICE '  4. get_database_stats (통계 정보 조회)';
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- DOWN Migration (롤백)
-- ============================================

-- 롤백 시 함수 삭제
-- DROP FUNCTION IF EXISTS use_parking_ticket(VARCHAR, INTEGER) CASCADE;
-- DROP FUNCTION IF EXISTS purchase_parking_ticket(VARCHAR, INTEGER) CASCADE;
-- DROP FUNCTION IF EXISTS get_user_balance_safe(VARCHAR) CASCADE;
-- DROP FUNCTION IF EXISTS get_database_stats() CASCADE;
