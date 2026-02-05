-- Seed Data: 001_sample_transactions
-- Description: 개발 및 테스트용 샘플 거래 데이터
-- Author: 백엔드 개발자
-- Date: 2024-02-05

-- ============================================
-- 샘플 데이터 삽입
-- ============================================

-- 기존 샘플 데이터 삭제 (멱등성 보장)
-- 프로덕션 환경에서는 실행하지 않도록 주의!
DELETE FROM transactions WHERE user_name IN (
    '김철수', '이영희', '박민수', '최지우', '정대현',
    '강미진', '송영철', '윤서연', '임동욱', '한수지'
);

-- ============================================
-- 시나리오 1: 기본 거래 패턴
-- ============================================

-- 김철수: 주차권 10개 구매, 3개 사용 (잔액: 7개)
INSERT INTO transactions (user_name, type, quantity, created_at) VALUES
    ('김철수', 'purchase', 10, '2024-02-01 09:00:00'),
    ('김철수', 'use', 3, '2024-02-02 08:30:00');

-- 이영희: 주차권 15개 구매, 5개 사용 (잔액: 10개)
INSERT INTO transactions (user_name, type, quantity, created_at) VALUES
    ('이영희', 'purchase', 15, '2024-02-01 10:15:00'),
    ('이영희', 'use', 5, '2024-02-03 09:00:00');

-- 박민수: 주차권 8개 구매, 사용 없음 (잔액: 8개)
INSERT INTO transactions (user_name, type, quantity, created_at) VALUES
    ('박민수', 'purchase', 8, '2024-02-01 11:30:00');

-- ============================================
-- 시나리오 2: 다양한 거래 패턴
-- ============================================

-- 최지우: 여러 번 구매 및 사용
-- 5개 구매 → 2개 사용 → 10개 추가 구매 → 3개 사용 (잔액: 10개)
INSERT INTO transactions (user_name, type, quantity, created_at) VALUES
    ('최지우', 'purchase', 5, '2024-02-01 14:00:00'),
    ('최지우', 'use', 2, '2024-02-02 10:00:00'),
    ('최지우', 'purchase', 10, '2024-02-03 15:00:00'),
    ('최지우', 'use', 3, '2024-02-04 11:00:00');

-- 정대현: 소량 구매 및 빈번한 사용
-- 3개 구매 → 1개 사용 → 2개 구매 → 1개 사용 (잔액: 3개)
INSERT INTO transactions (user_name, type, quantity, created_at) VALUES
    ('정대현', 'purchase', 3, '2024-02-02 09:00:00'),
    ('정대현', 'use', 1, '2024-02-02 17:00:00'),
    ('정대현', 'purchase', 2, '2024-02-03 09:30:00'),
    ('정대현', 'use', 1, '2024-02-04 08:45:00');

-- ============================================
-- 시나리오 3: 대량 거래
-- ============================================

-- 강미진: 대량 구매 (부서 단위 구매 시뮬레이션)
INSERT INTO transactions (user_name, type, quantity, created_at) VALUES
    ('강미진', 'purchase', 50, '2024-02-01 13:00:00'),
    ('강미진', 'use', 12, '2024-02-02 09:00:00'),
    ('강미진', 'use', 8, '2024-02-03 09:00:00'),
    ('강미진', 'use', 10, '2024-02-04 09:00:00');
-- 잔액: 20개

-- ============================================
-- 시나리오 4: 최근 활동 패턴
-- ============================================

-- 송영철: 최근에 주차권 구매 및 사용
INSERT INTO transactions (user_name, type, quantity, created_at) VALUES
    ('송영철', 'purchase', 12, NOW() - INTERVAL '2 days'),
    ('송영철', 'use', 4, NOW() - INTERVAL '1 day'),
    ('송영철', 'use', 2, NOW() - INTERVAL '3 hours');
-- 잔액: 6개

-- 윤서연: 오늘 구매 및 즉시 사용
INSERT INTO transactions (user_name, type, quantity, created_at) VALUES
    ('윤서연', 'purchase', 7, NOW() - INTERVAL '5 hours'),
    ('윤서연', 'use', 1, NOW() - INTERVAL '2 hours');
-- 잔액: 6개

-- ============================================
-- 시나리오 5: 잔액 소진 케이스
-- ============================================

-- 임동욱: 구매한 만큼 모두 사용 (잔액: 0개)
INSERT INTO transactions (user_name, type, quantity, created_at) VALUES
    ('임동욱', 'purchase', 5, '2024-02-01 10:00:00'),
    ('임동욱', 'use', 3, '2024-02-02 09:00:00'),
    ('임동욱', 'use', 2, '2024-02-03 09:00:00');

-- 한수지: 초과 사용 방지 시뮬레이션 (정상: 잔액 1개)
INSERT INTO transactions (user_name, type, quantity, created_at) VALUES
    ('한수지', 'purchase', 4, '2024-02-02 11:00:00'),
    ('한수지', 'use', 3, '2024-02-03 10:00:00');

-- ============================================
-- 데이터 검증
-- ============================================

-- 삽입된 데이터 확인
DO $$
DECLARE
    total_records INTEGER;
    total_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_records FROM transactions;
    SELECT COUNT(DISTINCT user_name) INTO total_users FROM transactions;

    RAISE NOTICE '시드 데이터 삽입 완료!';
    RAISE NOTICE '총 거래 내역: % 건', total_records;
    RAISE NOTICE '총 사용자 수: % 명', total_users;
END $$;

-- ============================================
-- 결과 확인 쿼리 (개발자 참고용)
-- ============================================

-- 1. 전체 잔액 확인
-- SELECT * FROM balance_view;
--
-- 예상 결과:
-- total_purchased | total_used | balance
-- ----------------|------------|--------
--      131        |     58     |   73

-- 2. 사용자별 잔액 확인
-- SELECT * FROM user_balance_view ORDER BY balance DESC;
--
-- 예상 결과:
-- user_name | purchased | used | balance
-- ----------|-----------|------|--------
-- 강미진    |    50     |  30  |   20
-- 최지우    |    15     |   5  |   10
-- 이영희    |    15     |   5  |   10
-- 박민수    |     8     |   0  |   8
-- 김철수    |    10     |   3  |   7
-- 송영철    |    12     |   6  |   6
-- 윤서연    |     7     |   1  |   6
-- 정대현    |     5     |   2  |   3
-- 한수지    |     4     |   3  |   1
-- 임동욱    |     5     |   5  |   0

-- 3. 최근 거래 내역 (최신 10건)
-- SELECT user_name, type, quantity, created_at
-- FROM transactions
-- ORDER BY created_at DESC
-- LIMIT 10;

-- 4. 사용자별 거래 통계
-- SELECT
--     user_name,
--     COUNT(*) as transaction_count,
--     COUNT(CASE WHEN type = 'purchase' THEN 1 END) as purchase_count,
--     COUNT(CASE WHEN type = 'use' THEN 1 END) as use_count
-- FROM transactions
-- GROUP BY user_name
-- ORDER BY transaction_count DESC;

-- ============================================
-- 정리 (Cleanup)
-- ============================================

-- 개발 환경에서만 실행
-- 모든 샘플 데이터 삭제 시:
-- DELETE FROM transactions;

-- 특정 사용자 데이터만 삭제 시:
-- DELETE FROM transactions WHERE user_name = '김철수';
