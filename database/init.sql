-- 주차 관리 서비스 초기 데이터베이스 스키마
-- Database: parking_management

-- 트랜잭션 테이블 생성
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'use')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 인덱스 추가 (성능 최적화)
    CONSTRAINT valid_type CHECK (type IN ('purchase', 'use'))
);

-- 인덱스 생성 (빠른 조회를 위해)
CREATE INDEX idx_transactions_user_name ON transactions(user_name);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(type);

-- 샘플 데이터 삽입 (테스트용)
INSERT INTO transactions (user_name, type, quantity) VALUES
    ('김철수', 'purchase', 10),
    ('이영희', 'purchase', 15),
    ('박민수', 'purchase', 8),
    ('김철수', 'use', 3),
    ('이영희', 'use', 5);

-- 잔여 수량 조회 뷰 생성 (편의성)
CREATE OR REPLACE VIEW balance_view AS
SELECT
    COALESCE(SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END), 0) as total_purchased,
    COALESCE(SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END), 0) as total_used,
    COALESCE(SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END), 0) as balance
FROM transactions;

-- 사용자별 잔여 수량 조회 뷰
CREATE OR REPLACE VIEW user_balance_view AS
SELECT
    user_name,
    COALESCE(SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END), 0) as purchased,
    COALESCE(SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END), 0) as used,
    COALESCE(SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END), 0) as balance
FROM transactions
GROUP BY user_name;

-- 데이터베이스 초기화 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '주차 관리 데이터베이스 초기화 완료!';
END $$;
