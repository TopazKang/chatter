# 데이터베이스 시드 데이터 가이드

## 개요

이 디렉토리는 개발 및 테스트 환경에서 사용할 샘플 데이터(Seed Data)를 포함합니다.

**⚠️ 중요**: 시드 데이터는 **프로덕션 환경에서 실행하지 마세요!**

## 시드 파일 목록

| 파일명 | 설명 | 데이터 수 |
|--------|------|-----------|
| `001_sample_transactions.sql` | 샘플 거래 내역 (10명 사용자) | 약 25건 |

## 시드 데이터 목적

### 1. 개발 환경 초기화
- 프론트엔드 개발 시 API 테스트용 데이터 제공
- UI 컴포넌트 렌더링 확인

### 2. 테스트 케이스 작성
- 단위 테스트 및 통합 테스트용 고정 데이터
- 다양한 시나리오 커버 (일반, 대량, 잔액 0 등)

### 3. 데모 및 프레젠테이션
- 클라이언트 또는 팀원에게 시스템 시연
- 실제와 유사한 데이터로 현실감 제공

## 포함된 시나리오

### 시나리오 1: 기본 거래 패턴
- **김철수**: 10개 구매 → 3개 사용 (잔액 7개)
- **이영희**: 15개 구매 → 5개 사용 (잔액 10개)
- **박민수**: 8개 구매 (잔액 8개)

### 시나리오 2: 다양한 거래 패턴
- **최지우**: 여러 번 구매 및 사용 (누적 거래)
- **정대현**: 소량 구매, 빈번한 사용

### 시나리오 3: 대량 거래
- **강미진**: 50개 대량 구매 (부서 단위 시뮬레이션)

### 시나리오 4: 최근 활동
- **송영철**: 최근 2일간 거래 (NOW() 기준)
- **윤서연**: 오늘 구매 및 즉시 사용

### 시나리오 5: 잔액 소진
- **임동욱**: 잔액 0개 (모두 사용)
- **한수지**: 잔액 1개 (거의 소진)

## 실행 방법

### 1. Docker 환경에서 자동 실행

```bash
# docker-compose.yml에 볼륨 마운트 추가
volumes:
  - ./database/seeds:/docker-entrypoint-initdb.d/seeds

# 컨테이너 재시작 (초기화 시에만 실행됨)
docker-compose down -v
docker-compose up -d
```

### 2. 수동 실행 (PostgreSQL 컨테이너 내부)

```bash
# 컨테이너 접속
docker exec -it parking-db psql -U postgres -d parking_management

# 시드 데이터 실행 (psql 프롬프트에서)
\i /path/to/seeds/001_sample_transactions.sql
```

### 3. 호스트에서 실행

```bash
# 파일을 파이프로 전달
docker exec -i parking-db psql -U postgres -d parking_management < database/seeds/001_sample_transactions.sql
```

### 4. Node.js 스크립트로 실행 (향후 구현)

```bash
# package.json 스크립트 추가
npm run db:seed

# 특정 시드 파일만 실행
npm run db:seed -- --file 001_sample_transactions.sql
```

## 시드 데이터 검증

### 1. 전체 잔액 확인

```sql
SELECT * FROM balance_view;

-- 예상 결과:
-- total_purchased | total_used | balance
-- ----------------|------------|--------
--      131        |     58     |   73
```

### 2. 사용자별 잔액 확인

```sql
SELECT * FROM user_balance_view ORDER BY balance DESC;

-- 예상 결과:
-- user_name | purchased | used | balance
-- ----------|-----------|------|--------
-- 강미진    |    50     |  30  |   20
-- 최지우    |    15     |   5  |   10
-- 이영희    |    15     |   5  |   10
-- ...
```

### 3. 거래 내역 총 개수 확인

```sql
SELECT COUNT(*) as total_transactions FROM transactions;

-- 예상 결과: 약 25건
```

### 4. 사용자 수 확인

```sql
SELECT COUNT(DISTINCT user_name) as total_users FROM transactions;

-- 예상 결과: 10명
```

## 데이터 초기화 (Reset)

### 개발 환경 전체 초기화

```bash
# 1. 모든 거래 데이터 삭제
docker exec -i parking-db psql -U postgres -d parking_management -c "DELETE FROM transactions;"

# 2. 시드 데이터 재실행
docker exec -i parking-db psql -U postgres -d parking_management < database/seeds/001_sample_transactions.sql
```

### 특정 사용자 데이터만 삭제

```sql
DELETE FROM transactions WHERE user_name = '김철수';
```

### 테이블 완전 초기화 (재생성)

```bash
# 1. 테이블 삭제
docker exec -i parking-db psql -U postgres -d parking_management -c "DROP TABLE IF EXISTS transactions CASCADE;"

# 2. 마이그레이션 재실행
docker exec -i parking-db psql -U postgres -d parking_management < database/init.sql

# 3. 시드 데이터 실행
docker exec -i parking-db psql -U postgres -d parking_management < database/seeds/001_sample_transactions.sql
```

## 새로운 시드 파일 추가

### 1. 파일 생성

```bash
touch database/seeds/002_additional_users.sql
```

### 2. 파일 구조 템플릿

```sql
-- Seed Data: 002_additional_users
-- Description: 추가 사용자 샘플 데이터
-- Author: 개발자 이름
-- Date: YYYY-MM-DD

-- 멱등성 보장 (기존 데이터 삭제)
DELETE FROM transactions WHERE user_name IN ('신규사용자1', '신규사용자2');

-- 데이터 삽입
INSERT INTO transactions (user_name, type, quantity, created_at) VALUES
    ('신규사용자1', 'purchase', 10, NOW()),
    ('신규사용자2', 'purchase', 5, NOW());

-- 검증
DO $$
BEGIN
    RAISE NOTICE '추가 시드 데이터 삽입 완료!';
END $$;
```

### 3. 네이밍 규칙

```
{버전번호}_{설명}.sql
```

- **버전번호**: 마이그레이션과 동일한 규칙 (001, 002, ...)
- **설명**: 스네이크 케이스 (snake_case)
- **예시**: `002_additional_users.sql`

## 환경별 시드 데이터 전략

### 개발 환경 (로컬)
- ✅ 모든 시드 데이터 실행
- ✅ 다양한 시나리오 포함
- ✅ 대량 데이터 테스트

### 테스트 환경 (CI/CD)
- ✅ 고정된 시드 데이터 (테스트 재현성)
- ❌ 랜덤 데이터 제외
- ✅ 최소한의 데이터로 빠른 실행

### 스테이징 환경
- ⚠️ 프로덕션과 유사한 데이터 (익명화)
- ❌ 개발용 시드 데이터 제외
- ✅ 실제 사용 패턴 시뮬레이션

### 프로덕션 환경
- ❌ **절대 시드 데이터 실행 금지**
- ✅ 실제 사용자 데이터만 사용

## 멱등성(Idempotency) 보장

시드 데이터는 **여러 번 실행해도 동일한 결과**를 보장해야 합니다.

### 방법 1: DELETE 후 INSERT

```sql
-- 기존 샘플 데이터 삭제
DELETE FROM transactions WHERE user_name IN ('김철수', '이영희');

-- 데이터 삽입
INSERT INTO transactions (user_name, type, quantity) VALUES
    ('김철수', 'purchase', 10),
    ('이영희', 'purchase', 15);
```

### 방법 2: UPSERT (ON CONFLICT)

```sql
-- id가 중복되면 업데이트
INSERT INTO transactions (id, user_name, type, quantity)
VALUES (1, '김철수', 'purchase', 10)
ON CONFLICT (id) DO UPDATE SET
    user_name = EXCLUDED.user_name,
    type = EXCLUDED.type,
    quantity = EXCLUDED.quantity;
```

### 방법 3: TRUNCATE (전체 삭제)

```sql
-- 테이블 전체 초기화 (프로덕션 금지!)
TRUNCATE TABLE transactions RESTART IDENTITY CASCADE;

-- 데이터 삽입
INSERT INTO transactions ...
```

## 대량 데이터 생성 (성능 테스트용)

### 10만 건 랜덤 데이터 생성

```sql
-- 성능 테스트용 대량 데이터 (별도 파일로 관리 권장)
INSERT INTO transactions (user_name, type, quantity, created_at)
SELECT
    'User' || (random() * 1000)::int AS user_name,
    CASE WHEN random() > 0.5 THEN 'purchase' ELSE 'use' END AS type,
    (random() * 10 + 1)::int AS quantity,
    NOW() - (random() * INTERVAL '365 days') AS created_at
FROM generate_series(1, 100000);
```

**주의사항**:
- 대량 데이터는 별도 파일로 관리 (`999_performance_test_data.sql`)
- 실행 시간이 오래 걸림 (수 분 소요)
- 일반 개발 환경에서는 실행하지 않음

## 시드 데이터 테스트

### API 테스트 시나리오

```bash
# 1. 전체 잔액 조회
curl http://localhost:3000/api/transactions/balance

# 예상 응답:
# {
#   "success": true,
#   "data": { "totalPurchased": 131, "totalUsed": 58, "balance": 73 }
# }

# 2. 특정 사용자 조회
curl http://localhost:3000/api/transactions/user/김철수

# 예상 응답:
# {
#   "success": true,
#   "data": [
#     { "id": 1, "user_name": "김철수", "type": "purchase", "quantity": 10 },
#     { "id": 4, "user_name": "김철수", "type": "use", "quantity": 3 }
#   ]
# }

# 3. 전체 거래 내역 조회
curl http://localhost:3000/api/transactions

# 4. 새 거래 생성
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"user_name": "테스트사용자", "type": "purchase", "quantity": 5}'
```

## 트러블슈팅

### 문제 1: 시드 데이터가 중복 삽입됨

**증상**: 김철수의 거래 내역이 20건 이상

**원인**: 멱등성 보장 로직 누락

**해결**:
```sql
-- 파일 시작 부분에 DELETE 추가
DELETE FROM transactions WHERE user_name IN (...);
```

### 문제 2: 외래키 제약조건 위반

**증상**: "foreign key constraint" 에러

**원인**: 참조 테이블의 데이터가 없음

**해결**:
- 시드 데이터 실행 순서 조정
- 참조 테이블 시드 먼저 실행

### 문제 3: 타임존 문제

**증상**: created_at이 예상과 다른 시간대

**해결**:
```sql
-- 명시적으로 타임존 지정
INSERT INTO transactions (user_name, type, quantity, created_at) VALUES
    ('김철수', 'purchase', 10, '2024-02-01 09:00:00+09');
```

## 추가 자료

- [PostgreSQL - INSERT 문서](https://www.postgresql.org/docs/15/sql-insert.html)
- [PostgreSQL - generate_series](https://www.postgresql.org/docs/15/functions-srf.html)
- [../init.sql](../init.sql) - 초기 스키마 파일
- [../migrations/](../migrations/) - 마이그레이션 파일

---

**문서 버전**: 1.0.0
**최종 업데이트**: 2024-02-05
