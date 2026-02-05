# 데이터베이스 설계 문서 (Database Design Document)

## 프로젝트: 회사 주차 관리 서비스

**작성일**: 2024-02-05
**작성자**: 백엔드 개발자 (시니어)
**버전**: 1.0.0

---

## 📋 목차

1. [개요](#개요)
2. [데이터베이스 선택 근거](#데이터베이스-선택-근거)
3. [스키마 설계](#스키마-설계)
4. [인덱스 전략](#인덱스-전략)
5. [뷰(View) 설계](#뷰view-설계)
6. [제약조건(Constraints)](#제약조건constraints)
7. [데이터 타입 선택 근거](#데이터-타입-선택-근거)
8. [트랜잭션 격리 수준](#트랜잭션-격리-수준)
9. [성능 최적화 전략](#성능-최적화-전략)
10. [백업 및 복구 전략](#백업-및-복구-전략)
11. [마이그레이션 전략](#마이그레이션-전략)
12. [확장성 고려사항](#확장성-고려사항)

---

## 개요

### 프로젝트 목적
회사 직원들의 주차권 구매 및 사용 내역을 추적하고, 실시간으로 잔여 주차권 수량을 확인할 수 있는 시스템의 데이터베이스 설계.

### 핵심 요구사항
1. **데이터 무결성**: 주차권 거래 데이터의 정확성 보장 (ACID 속성)
2. **조회 성능**: 잔여 수량 조회가 빈번하므로 읽기 성능 최적화
3. **감사 추적**: 모든 거래 내역을 시간순으로 기록 (Audit Trail)
4. **동시성 제어**: 여러 직원이 동시에 주차권을 사용할 때 충돌 방지

---

## 데이터베이스 선택 근거

### PostgreSQL 15 선택 이유

#### 1. ACID 트랜잭션 완벽 지원
- **Atomicity (원자성)**: 주차권 구매/사용 작업이 전부 성공하거나 전부 실패 (부분 성공 없음)
- **Consistency (일관성)**: 제약조건(CHECK, NOT NULL)을 통한 데이터 무결성 보장
- **Isolation (격리성)**: 동시 트랜잭션 간 간섭 방지
- **Durability (영속성)**: 서버 장애 시에도 커밋된 데이터는 보존

#### 2. 집계 쿼리 성능 우수
- **CASE WHEN**: 조건부 집계 (purchase/use 구분)
- **COALESCE**: NULL 안전 처리로 에지 케이스 대응
- **인덱스 최적화**: B-Tree 인덱스로 빠른 조회

#### 3. 뷰(View) 기능
- **복잡한 집계 로직 캡슐화**: `balance_view`, `user_balance_view`
- **쿼리 재사용성**: 애플리케이션 코드 단순화
- **향후 Materialized View 전환 가능**: 대량 데이터 시 성능 향상

#### 4. 오픈소스 및 생태계
- **무료**: 상업적 사용 가능 (MIT 라이선스)
- **풍부한 도구**: pgAdmin, pg_stat_statements 등
- **활발한 커뮤니티**: 문제 해결 및 최신 기능 업데이트

#### 5. Docker 친화적
- **공식 이미지**: postgres:15-alpine (경량 이미지)
- **초기화 스크립트**: /docker-entrypoint-initdb.d/ 지원
- **환경 변수 설정**: POSTGRES_DB, POSTGRES_USER 등

---

## 스키마 설계

### ERD (Entity Relationship Diagram)

```
┌─────────────────────────────────────────────┐
│             transactions                     │
├─────────────────────────────────────────────┤
│ PK │ id           │ SERIAL                  │
│    │ user_name    │ VARCHAR(100) NOT NULL   │
│    │ type         │ VARCHAR(20) NOT NULL    │ ← CHECK ('purchase', 'use')
│    │ quantity     │ INTEGER NOT NULL        │ ← CHECK (> 0)
│    │ created_at   │ TIMESTAMP DEFAULT NOW() │
├─────────────────────────────────────────────┤
│ Indexes:                                     │
│  - idx_transactions_user_name               │
│  - idx_transactions_created_at              │
│  - idx_transactions_type                    │
└─────────────────────────────────────────────┘
```

### 테이블 설계 철학

#### 단일 테이블 접근법 (Single Table Design)

**결정**: 구매(purchase)와 사용(use)을 별도 테이블로 분리하지 않고, 하나의 `transactions` 테이블에 `type` 필드로 구분

**당위성**:

**장점**:
1. **쿼리 단순화**:
   - 잔여 수량 계산 시 JOIN 불필요
   - 단일 테이블에서 SUM 집계만으로 계산 가능
   ```sql
   -- 단일 테이블 접근법 (현재)
   SELECT
     SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) -
     SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END) AS balance
   FROM transactions;

   -- 분리 테이블 접근법 (대안)
   SELECT
     COALESCE(p.total, 0) - COALESCE(u.total, 0) AS balance
   FROM
     (SELECT SUM(quantity) AS total FROM purchases) p
   CROSS JOIN
     (SELECT SUM(quantity) AS total FROM usages) u;
   ```

2. **감사 추적 용이**:
   - 모든 거래가 시간순으로 하나의 테이블에 기록
   - "누가 언제 무엇을 했는지" 추적 간단
   - 특정 시점의 상태 복원 가능 (Time-based Audit)

3. **트랜잭션 관리 단순**:
   - 하나의 INSERT 작업으로 완료
   - 다중 테이블 동기화 문제 없음

4. **확장 용이**:
   - 새로운 거래 타입 추가 시 테이블 구조 변경 불필요
   - 예: `type = 'refund'`, `type = 'transfer'` 추가 가능

**트레이드오프**:
- ❌ **단점**: 타입별 특화된 필드 추가 어려움
  - 예: 구매 시에만 필요한 `payment_method` 필드
  - 해결: JSON 타입 `metadata` 필드로 유연성 확보 (향후 확장)

- ❌ **단점**: 타입별 제약조건 설정 제한
  - 예: 구매는 항상 양수, 사용은 잔액 초과 불가
  - 해결: 애플리케이션 레벨에서 검증 (비즈니스 로직)

**왜 이 방식을 선택했는가?**
- 현재 요구사항에서는 두 거래 타입이 동일한 필드를 사용
- 조회(읽기)가 쓰기보다 훨씬 빈번 → JOIN 오버헤드 제거가 중요
- 감사 추적 요구사항이 명확 → 시간순 단일 로그 필요

---

### 테이블 상세 명세

#### `transactions` 테이블

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 | 선택 근거 |
|--------|------------|----------|------|-----------|
| `id` | SERIAL | PRIMARY KEY | 고유 식별자 (자동 증가) | 자연키보다 대리키가 안정적 |
| `user_name` | VARCHAR(100) | NOT NULL | 직원 이름 | 최대 100자로 대부분의 이름 커버 |
| `type` | VARCHAR(20) | NOT NULL, CHECK | 거래 유형 ('purchase', 'use') | ENUM보다 유연 (타입 추가 용이) |
| `quantity` | INTEGER | NOT NULL, CHECK | 주차권 수량 (> 0) | 음수 방지로 데이터 무결성 보장 |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 거래 발생 시각 | 감사 추적 및 시간순 정렬 |

---

## 인덱스 전략

### 인덱스 설계 철학

인덱스는 **읽기 성능을 향상**시키지만 **쓰기 성능을 저하**시키는 트레이드오프가 있습니다.
이 시스템은 조회(읽기)가 더 빈번하므로 **읽기 최적화**를 우선합니다.

### 생성된 인덱스

#### 1. `idx_transactions_user_name`
```sql
CREATE INDEX idx_transactions_user_name ON transactions(user_name);
```

**목적**: 특정 사용자의 거래 내역 조회 최적화

**쿼리 패턴**:
```sql
-- 이 쿼리가 인덱스를 활용함
SELECT * FROM transactions WHERE user_name = '김철수';
SELECT user_name, SUM(quantity) FROM transactions WHERE user_name = '김철수' GROUP BY user_name;
```

**성능 향상**:
- 인덱스 없이: **O(n)** - 전체 테이블 스캔 (Full Table Scan)
- 인덱스 있음: **O(log n)** - B-Tree 탐색

**실제 사용 사례**:
- API 엔드포인트: `GET /api/transactions/user/:name`
- 사용자별 대시보드에서 개인 거래 내역 조회

#### 2. `idx_transactions_created_at`
```sql
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
```

**목적**: 최근 거래 내역 조회 최적화 (시간순 정렬)

**쿼리 패턴**:
```sql
-- 최근 거래 내역 조회 (페이지네이션)
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 20;

-- 특정 기간 거래 조회
SELECT * FROM transactions WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01';
```

**DESC 정렬 인덱스 선택 이유**:
- 대부분의 조회가 최신 데이터부터 조회 (ORDER BY created_at DESC)
- PostgreSQL은 인덱스 스캔 방향을 자동 조정하지만, DESC 인덱스가 더 효율적

**실제 사용 사례**:
- 전체 거래 내역 페이지네이션
- 특정 월/주/일별 리포트 생성

#### 3. `idx_transactions_type`
```sql
CREATE INDEX idx_transactions_type ON transactions(type);
```

**목적**: 거래 타입별 집계 및 필터링 최적화

**쿼리 패턴**:
```sql
-- 구매만 조회
SELECT * FROM transactions WHERE type = 'purchase';

-- 타입별 통계
SELECT type, COUNT(*), SUM(quantity) FROM transactions GROUP BY type;
```

**카디널리티(Cardinality) 고려**:
- 현재 타입: 'purchase', 'use' (2가지)
- **낮은 카디널리티** (Low Cardinality)지만 인덱스 생성 이유:
  - 집계 쿼리에서 WHERE type = 'purchase' 필터링 시 성능 향상
  - Bitmap Index Scan으로 효율적 처리 가능
  - 향후 타입이 추가될 가능성 대비 ('refund', 'transfer' 등)

**실제 사용 사례**:
- 잔여 수량 계산 (balance_view에서 사용)
- 타입별 통계 리포트

---

### 복합 인덱스 검토 및 선택하지 않은 이유

#### 복합 인덱스 후보: `(user_name, created_at)`

**검토 내용**:
```sql
CREATE INDEX idx_user_created ON transactions(user_name, created_at DESC);
```

**장점**:
- 사용자별 최근 거래 조회 시 성능 향상
- 하나의 인덱스로 두 조건 동시 최적화

**선택하지 않은 이유**:
1. **저장 공간 증가**: 복합 인덱스는 개별 인덱스보다 크기가 큼
2. **유연성 감소**: `created_at`만 사용하는 쿼리에서는 인덱스 활용 불가
3. **현재 데이터 규모**: 초기에는 개별 인덱스로 충분한 성능
4. **향후 추가 가능**: 성능 측정 후 필요시 추가 (Premature Optimization 방지)

**의사결정 기준**:
- 실제 쿼리 패턴 분석 후 복합 인덱스 필요성 재검토
- EXPLAIN ANALYZE로 성능 측정 후 결정

---

### 인덱스 유지보수 전략

#### 1. 인덱스 모니터링
```sql
-- 인덱스 사용 통계 확인
SELECT
  schemaname, tablename, indexname,
  idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'transactions';

-- 사용되지 않는 인덱스 확인 (idx_scan = 0)
SELECT indexname FROM pg_stat_user_indexes
WHERE tablename = 'transactions' AND idx_scan = 0;
```

#### 2. 인덱스 재구성 (Reindex)
```sql
-- 인덱스 조각화 해소 (주기적 실행 권장)
REINDEX TABLE transactions;
```

**언제 실행하는가?**
- 대량 데이터 삽입/삭제 후
- 인덱스 블로트(Bloat) 발생 시
- 주기적 유지보수 (월 1회)

#### 3. 인덱스 크기 모니터링
```sql
-- 인덱스 크기 확인
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename = 'transactions';
```

---

## 뷰(View) 설계

### 1. `balance_view` - 전체 잔여 수량 조회

#### 뷰 정의
```sql
CREATE OR REPLACE VIEW balance_view AS
SELECT
  COALESCE(SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END), 0) AS total_purchased,
  COALESCE(SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END), 0) AS total_used,
  COALESCE(
    SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) -
    SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END), 0
  ) AS balance
FROM transactions;
```

#### 설계 근거

**1. CASE WHEN 사용 이유**
- **조건부 집계**: 타입에 따라 다르게 계산 (purchase는 더하고, use는 빼기)
- **단일 테이블 스캔**: 한 번의 테이블 스캔으로 모든 집계 완료 (효율적)

**대안과 비교**:
```sql
-- 대안 1: UNION을 사용한 집계 (비효율적)
SELECT
  (SELECT SUM(quantity) FROM transactions WHERE type = 'purchase') AS purchased,
  (SELECT SUM(quantity) FROM transactions WHERE type = 'use') AS used;
-- 문제점: 테이블을 2번 스캔 (현재 방식은 1번만 스캔)

-- 대안 2: JOIN 사용 (복잡함)
SELECT p.total AS purchased, u.total AS used, p.total - u.total AS balance
FROM
  (SELECT SUM(quantity) AS total FROM transactions WHERE type = 'purchase') p
CROSS JOIN
  (SELECT SUM(quantity) AS total FROM transactions WHERE type = 'use') u;
-- 문제점: 쿼리 복잡도 증가, CROSS JOIN 오버헤드
```

**2. COALESCE 사용 이유**
- **NULL 안전 처리**: 거래가 하나도 없을 때 NULL 대신 0 반환
- **프론트엔드 간편화**: 애플리케이션에서 NULL 체크 불필요

**예시**:
```sql
-- 거래가 없을 때
SELECT SUM(quantity) FROM transactions WHERE type = 'purchase';
-- 결과: NULL (COALESCE 없으면)

SELECT COALESCE(SUM(quantity), 0) FROM transactions WHERE type = 'purchase';
-- 결과: 0 (COALESCE 있으면)
```

#### 사용 예시
```sql
-- API 엔드포인트에서 사용
SELECT * FROM balance_view;

-- 결과 예시:
-- total_purchased | total_used | balance
-- ----------------|------------|--------
--      100        |     45     |   55
```

#### 성능 특성
- **쿼리 실행 시점**: View는 실시간으로 계산 (캐싱 없음)
- **최신 데이터 보장**: 항상 현재 상태 반영
- **성능 트레이드오프**:
  - 장점: 항상 정확한 데이터
  - 단점: 매번 계산 오버헤드

**향후 최적화 계획**:
```sql
-- Materialized View로 전환 (데이터가 많아질 때)
CREATE MATERIALIZED VIEW balance_view_mat AS
SELECT ...;

-- 주기적 갱신 (5초마다)
REFRESH MATERIALIZED VIEW balance_view_mat;
```

---

### 2. `user_balance_view` - 사용자별 잔여 수량 조회

#### 뷰 정의
```sql
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
```

#### 설계 근거

**1. GROUP BY user_name**
- **사용자별 집계**: 각 사용자의 개별 잔액 계산
- **다중 레코드 반환**: 사용자 수만큼 레코드 생성

**2. balance_view와의 차이점**

| 구분 | balance_view | user_balance_view |
|------|--------------|-------------------|
| 집계 수준 | 전체 합계 (1행) | 사용자별 (N행) |
| GROUP BY | 없음 | user_name |
| 사용 사례 | 전체 잔여 수량 표시 | 사용자 대시보드 |

#### 사용 예시
```sql
-- 모든 사용자의 잔액 조회
SELECT * FROM user_balance_view;

-- 결과 예시:
-- user_name | purchased | used | balance
-- ----------|-----------|------|--------
-- 김철수    |    10     |  3   |   7
-- 이영희    |    15     |  5   |  10
-- 박민수    |     8     |  0   |   8

-- 특정 사용자 조회
SELECT * FROM user_balance_view WHERE user_name = '김철수';

-- 잔액이 부족한 사용자 찾기
SELECT * FROM user_balance_view WHERE balance < 5 ORDER BY balance;
```

#### 인덱스 활용
- `idx_transactions_user_name` 인덱스를 활용하여 GROUP BY 성능 향상
- EXPLAIN ANALYZE로 확인:
  ```sql
  EXPLAIN ANALYZE SELECT * FROM user_balance_view WHERE user_name = '김철수';
  -- Index Scan using idx_transactions_user_name
  ```

---

### View vs Materialized View 선택 기준

#### 현재 선택: 일반 View
**이유**:
1. **데이터 규모**: 초기에는 거래 수가 적음 (수천~수만 건)
2. **정확성 우선**: 실시간 데이터가 중요 (주차권 잔액은 즉시 반영 필요)
3. **복잡도 감소**: Materialized View는 갱신 로직 필요

#### 향후 Materialized View 전환 고려 시점
**조건**:
1. 거래 데이터가 **10만 건 이상**
2. View 조회 시간이 **1초 이상**
3. 실시간성보다 **성능이 더 중요**한 시점

**전환 방법**:
```sql
-- 1. Materialized View 생성
CREATE MATERIALIZED VIEW balance_view_mat AS
SELECT ...;

-- 2. 고유 인덱스 생성 (빠른 갱신을 위해)
CREATE UNIQUE INDEX ON balance_view_mat (일부_컬럼);

-- 3. 자동 갱신 설정 (pg_cron 또는 애플리케이션 레벨)
-- 예: 5초마다 갱신
REFRESH MATERIALIZED VIEW CONCURRENTLY balance_view_mat;
```

---

## 제약조건(Constraints)

### 1. PRIMARY KEY: `id`
```sql
id SERIAL PRIMARY KEY
```

**역할**: 각 거래를 고유하게 식별

**SERIAL 타입 선택 이유**:
- **자동 증가**: 애플리케이션에서 ID 생성 불필요
- **충돌 방지**: 시퀀스(Sequence)로 고유성 보장
- **정렬 효율**: 연속된 정수로 인덱스 스캔 효율적

**대안 검토**:
- ❌ UUID: 고유성은 높지만 인덱스 크기 증가 (16바이트 vs 4바이트)
- ❌ 복합키 (user_name, created_at): 자연키는 변경 가능성 있음

---

### 2. NOT NULL 제약조건

```sql
user_name VARCHAR(100) NOT NULL,
type VARCHAR(20) NOT NULL,
quantity INTEGER NOT NULL
```

**당위성**: 모든 필드가 필수

| 컬럼 | NULL 허용 시 문제점 | 해결 방법 |
|------|---------------------|-----------|
| user_name | 누가 거래했는지 알 수 없음 | NOT NULL 강제 |
| type | 구매인지 사용인지 구분 불가 | NOT NULL 강제 |
| quantity | 수량 0과 NULL 구분 모호 | NOT NULL + CHECK (> 0) |

**데이터 무결성 보장**:
- 데이터베이스 레벨에서 NULL 삽입 차단
- 애플리케이션 버그로 인한 잘못된 데이터 방지

---

### 3. CHECK 제약조건

#### 3-1. `type` 필드: 허용된 값만 저장
```sql
type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'use'))
```

**당위성**:
- **데이터 일관성**: 오타 방지 ('puchase', 'used' 등 잘못된 값 차단)
- **비즈니스 규칙 강제**: 정의된 거래 타입만 허용

**ENUM 대신 CHECK 선택 이유**:

| 구분 | ENUM | CHECK |
|------|------|-------|
| 타입 추가 | ALTER TYPE 필요 (복잡) | 제약조건 수정만 (간단) |
| 유연성 | 낮음 | 높음 |
| 성능 | 약간 빠름 | 거의 동일 |
| 가독성 | 높음 | 높음 |

**향후 타입 추가 시**:
```sql
-- CHECK 제약조건 수정 (간단)
ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('purchase', 'use', 'refund', 'transfer'));

-- ENUM은 더 복잡 (참고)
-- ALTER TYPE transaction_type ADD VALUE 'refund';
```

#### 3-2. `quantity` 필드: 양수만 허용
```sql
quantity INTEGER NOT NULL CHECK (quantity > 0)
```

**당위성**:
- **음수 방지**: 잘못된 입력으로 인한 데이터 오염 방지
- **0 방지**: 의미 없는 거래 기록 차단

**비즈니스 로직**:
- 주차권 수량은 항상 1개 이상이어야 의미 있음
- 0개 구매 또는 사용은 거래로 기록할 필요 없음

**대안 검토**:
```sql
-- 대안 1: 0 허용
quantity INTEGER CHECK (quantity >= 0)
-- 문제점: 의미 없는 데이터 허용

-- 대안 2: 음수 허용 (취소를 음수로 표현)
quantity INTEGER
-- 문제점: 비즈니스 로직 복잡화, 타입 필드와 중복
```

---

### 4. DEFAULT 제약조건

```sql
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**당위성**:
- **자동 타임스탬프**: 애플리케이션에서 시간 생성 불필요
- **일관성**: 서버 시간대 기준으로 통일
- **감사 추적**: 모든 거래의 정확한 시각 기록

**CURRENT_TIMESTAMP vs NOW()**:
- 두 함수 모두 동일한 결과
- CURRENT_TIMESTAMP가 SQL 표준 (이식성 높음)

**시간대 고려**:
```sql
-- 타임존 명시 (향후 국제화 대비)
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
```
- 현재는 TIMESTAMP 사용 (간단)
- 향후 해외 지사 대응 시 WITH TIME ZONE으로 변경 고려

---

## 데이터 타입 선택 근거

### 1. `user_name`: VARCHAR(100)

**선택 근거**:
- **최대 길이 제한**: 비정상적으로 긴 이름 방지 (DoS 공격 대응)
- **100자 근거**:
  - 한글 이름: 평균 3-5자 (최대 10자 이내)
  - 영문 이름: 평균 15-30자 (최대 50자 이내)
  - 여유 확보: 특수 케이스 대응 (복합 성명, 별칭 등)

**대안 검토**:
- ❌ TEXT: 무제한 길이로 메모리 낭비 가능
- ❌ VARCHAR(50): 너무 짧아 일부 이름 저장 불가
- ✅ VARCHAR(100): 적절한 균형

**인덱스 효율성**:
- VARCHAR는 실제 데이터 길이만큼만 저장
- 인덱스 크기 = 평균 이름 길이 (4-5바이트)

---

### 2. `type`: VARCHAR(20)

**선택 근거**:
- **가변 길이**: 'purchase'(8자), 'use'(3자) → VARCHAR가 효율적
- **20자 근거**: 향후 추가 타입 대비 ('refund'(6자), 'transfer'(8자))

**CHAR vs VARCHAR 비교**:

| 타입 | 저장 방식 | 공간 효율 | 성능 |
|------|-----------|----------|------|
| CHAR(20) | 고정 길이 (항상 20바이트) | 낮음 ('use'도 20바이트) | 약간 빠름 |
| VARCHAR(20) | 가변 길이 (실제 길이만) | 높음 ('use'는 3바이트) | 거의 동일 |

**결론**: VARCHAR가 공간 효율적이고 성능 차이 미미

---

### 3. `quantity`: INTEGER

**선택 근거**:
- **범위**: -2,147,483,648 ~ 2,147,483,647 (약 21억)
- **충분한 범위**: 일반적인 주차권 수량은 1~10,000 정도
- **4바이트**: 메모리 효율적

**대안 검토**:

| 타입 | 범위 | 크기 | 선택 여부 | 이유 |
|------|------|------|-----------|------|
| SMALLINT | -32,768 ~ 32,767 | 2바이트 | ❌ | 충분하지만 향후 확장성 부족 |
| INTEGER | -21억 ~ 21억 | 4바이트 | ✅ | 적절한 범위 + 표준 타입 |
| BIGINT | -9경 ~ 9경 | 8바이트 | ❌ | 과도한 범위, 메모리 낭비 |
| NUMERIC | 임의 정밀도 | 가변 | ❌ | 정수만 필요, 오버헤드 |

**비즈니스 로직 검증**:
- 데이터베이스: 1 이상 (CHECK 제약조건)
- 애플리케이션: 1~10,000 범위 (실용적 제한)

---

### 4. `created_at`: TIMESTAMP

**선택 근거**:
- **정밀도**: 마이크로초 단위 (1/1,000,000초)
- **범위**: 4713 BC ~ 294276 AD (충분)
- **8바이트**: 효율적

**TIMESTAMP vs TIMESTAMPTZ (WITH TIME ZONE)**:

| 타입 | 타임존 저장 | 권장 사용 사례 |
|------|------------|----------------|
| TIMESTAMP | ❌ | 단일 타임존 환경 (현재) |
| TIMESTAMPTZ | ✅ | 다국적 서비스 (향후) |

**현재 선택**: TIMESTAMP (서버 타임존 기준)
**향후 마이그레이션 계획**:
```sql
-- 타임존 지원 추가 시
ALTER TABLE transactions
ALTER COLUMN created_at TYPE TIMESTAMPTZ;
```

**대안 검토**:
- ❌ DATE: 시간 정보 없음 (부족)
- ❌ TIME: 날짜 정보 없음 (부족)
- ✅ TIMESTAMP: 날짜 + 시간 모두 포함

---

## 트랜잭션 격리 수준

### PostgreSQL 격리 수준 개요

PostgreSQL은 4가지 트랜잭션 격리 수준을 지원합니다:

| 격리 수준 | Dirty Read | Non-Repeatable Read | Phantom Read | 성능 |
|-----------|-----------|---------------------|--------------|------|
| Read Uncommitted | ✅ 발생 | ✅ 발생 | ✅ 발생 | 최고 |
| Read Committed | ❌ 방지 | ✅ 발생 | ✅ 발생 | 높음 |
| Repeatable Read | ❌ 방지 | ❌ 방지 | ✅ 발생 | 중간 |
| Serializable | ❌ 방지 | ❌ 방지 | ❌ 방지 | 낮음 |

### 현재 설정: Read Committed (PostgreSQL 기본값)

**선택 근거**:
1. **Dirty Read 방지**: 커밋되지 않은 데이터는 읽지 않음
2. **성능**: Repeatable Read보다 빠름 (락 경합 적음)
3. **실용성**: 대부분의 애플리케이션에 충분

### 동시성 시나리오 분석

#### 시나리오 1: 두 직원이 동시에 주차권 사용

**상황**:
- 현재 잔액: 5개
- 직원 A: 3개 사용 시도
- 직원 B: 3개 사용 시도 (동시)

**Read Committed 동작**:
```sql
-- 트랜잭션 A
BEGIN;
SELECT balance FROM balance_view; -- 결과: 5
INSERT INTO transactions (user_name, type, quantity) VALUES ('직원A', 'use', 3);
COMMIT; -- 잔액: 2

-- 트랜잭션 B (동시 실행)
BEGIN;
SELECT balance FROM balance_view; -- 결과: 5 (A가 커밋 전)
INSERT INTO transactions (user_name, type, quantity) VALUES ('직원B', 'use', 3);
COMMIT; -- 잔액: -1 (문제 발생!)
```

**문제점**: 잔액 초과 사용 가능 (Race Condition)

**해결 방법 1: 애플리케이션 레벨 검증**
```javascript
// 컨트롤러에서 트랜잭션 사용
await sequelize.transaction(async (t) => {
  // FOR UPDATE로 행 잠금
  const balance = await sequelize.query(
    'SELECT balance FROM balance_view FOR UPDATE',
    { transaction: t }
  );

  if (balance < quantity) {
    throw new Error('잔액 부족');
  }

  await Transaction.create({ user_name, type: 'use', quantity }, { transaction: t });
});
```

**해결 방법 2: Repeatable Read 격리 수준 사용**
```sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- 동시 수정 시 자동으로 재시도 또는 에러
```

**현재 선택**: 해결 방법 1 (애플리케이션 레벨 검증)
- **이유**: Read Committed의 성능 유지하면서 비즈니스 로직으로 제어

---

### 낙관적 잠금 vs 비관적 잠금

#### 비관적 잠금 (Pessimistic Locking)
```sql
SELECT * FROM balance_view FOR UPDATE;
```
- **특징**: 레코드를 읽는 즉시 잠금
- **장점**: 충돌 방지 확실
- **단점**: 성능 저하 (다른 트랜잭션 대기)

#### 낙관적 잠금 (Optimistic Locking)
```sql
-- version 컬럼 추가 (향후)
UPDATE transactions SET version = version + 1 WHERE id = ? AND version = ?;
```
- **특징**: 커밋 시점에만 충돌 확인
- **장점**: 성능 우수 (대부분 성공)
- **단점**: 충돌 시 재시도 필요

**현재 선택**: 비관적 잠금
- **이유**: 주차권 사용은 충돌 가능성 높음 → 확실한 방지 필요

---

## 성능 최적화 전략

### 1. 쿼리 최적화

#### EXPLAIN ANALYZE 사용
```sql
EXPLAIN ANALYZE SELECT * FROM balance_view;

-- 예상 결과:
-- Aggregate  (cost=25.00..25.01 rows=1 width=16) (actual time=0.123..0.124 rows=1 loops=1)
--   ->  Seq Scan on transactions  (cost=0.00..22.00 rows=1000 width=9) (actual time=0.012..0.089 rows=1000 loops=1)
-- Planning Time: 0.045 ms
-- Execution Time: 0.150 ms
```

**분석 기준**:
- **cost**: 추정 비용 (낮을수록 좋음)
- **actual time**: 실제 실행 시간
- **rows**: 처리된 행 수
- **Seq Scan vs Index Scan**: 인덱스 사용 여부 확인

---

### 2. 인덱스 효율성 검증

```sql
-- 인덱스가 사용되는지 확인
EXPLAIN ANALYZE
SELECT * FROM transactions WHERE user_name = '김철수';

-- 기대 결과: Index Scan using idx_transactions_user_name
-- 만약 Seq Scan이면 인덱스 미사용 → 문제 분석 필요
```

**인덱스 미사용 원인**:
1. **통계 정보 오래됨**: `ANALYZE transactions;` 실행
2. **쿼리 패턴 부적합**: LIKE '%김철수%' → 인덱스 사용 불가
3. **데이터 분포**: 카디널리티 너무 낮으면 Seq Scan이 더 빠를 수 있음

---

### 3. 연결 풀 설정

```javascript
// Sequelize 연결 풀 설정
const sequelize = new Sequelize({
  pool: {
    max: 20,        // 최대 동시 연결 수
    min: 5,         // 최소 유지 연결 수
    acquire: 30000, // 연결 획득 타임아웃 (30초)
    idle: 10000     // 유휴 연결 해제 시간 (10초)
  }
});
```

**설정 근거**:
- **max: 20**: 동시 접속자 수 대비 (직원 100명 가정 시 충분)
- **min: 5**: 즉시 응답 가능한 대기 연결 확보
- **acquire: 30000**: 느린 쿼리 대비 충분한 시간
- **idle: 10000**: 리소스 낭비 방지

---

### 4. 쿼리 결과 캐싱 (향후 Redis 도입)

```javascript
// Redis 캐싱 예시 (향후 구현)
async function getBalance() {
  const cached = await redis.get('balance');
  if (cached) return JSON.parse(cached);

  const balance = await sequelize.query('SELECT * FROM balance_view');
  await redis.setex('balance', 5, JSON.stringify(balance)); // 5초 TTL
  return balance;
}
```

**캐싱 전략**:
- **TTL: 5초**: 실시간성과 성능의 균형
- **캐시 무효화**: 주차권 사용/구매 시 즉시 삭제
- **적용 시점**: 조회가 쓰기보다 10배 이상 많을 때

---

### 5. 파티셔닝 (Partitioning) 전략

**적용 시점**: 거래 데이터가 100만 건 이상

**파티셔닝 기준**: `created_at` (월별)

```sql
-- 월별 파티셔닝 (향후)
CREATE TABLE transactions (
  id SERIAL,
  user_name VARCHAR(100),
  type VARCHAR(20),
  quantity INTEGER,
  created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

-- 2024년 1월 파티션
CREATE TABLE transactions_2024_01 PARTITION OF transactions
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- 2024년 2월 파티션
CREATE TABLE transactions_2024_02 PARTITION OF transactions
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

**장점**:
- 오래된 데이터 조회 시 불필요한 파티션 스캔 제외
- 파티션별 인덱스 크기 감소 → 쿼리 속도 향상
- 오래된 데이터 아카이빙 용이

---

## 백업 및 복구 전략

### 1. 정기 백업 (pg_dump)

```bash
# 전체 데이터베이스 백업 (일 1회)
pg_dump -U postgres -d parking_management -F c -f backup_$(date +%Y%m%d).dump

# 특정 테이블만 백업
pg_dump -U postgres -d parking_management -t transactions -F c -f transactions_backup.dump
```

**백업 스케줄**:
- **일별 백업**: 매일 새벽 2시 (사용자 적은 시간)
- **주별 백업**: 매주 일요일 전체 백업
- **월별 백업**: 장기 보관용 (6개월 보관)

**백업 파일 관리**:
- 최근 7일: 일별 백업
- 최근 4주: 주별 백업
- 최근 6개월: 월별 백업
- 오래된 백업 자동 삭제

---

### 2. 복구 절차

```bash
# 전체 데이터베이스 복구
pg_restore -U postgres -d parking_management -c backup_20240205.dump

# 특정 테이블만 복구
pg_restore -U postgres -d parking_management -t transactions transactions_backup.dump
```

**복구 시나리오**:
1. **데이터 손실**: 최신 백업으로 복구
2. **잘못된 삭제**: 백업에서 특정 데이터 추출
3. **테이블 손상**: 테이블 재생성 후 백업 복구

---

### 3. Point-in-Time Recovery (PITR)

```bash
# WAL (Write-Ahead Logging) 아카이빙 설정
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /archive/%f'
```

**PITR 장점**:
- 특정 시점으로 정확히 복구 (예: 오전 11시 30분 상태)
- 백업 사이의 데이터 손실 방지

**적용 시점**: 프로덕션 환경 배포 후

---

## 마이그레이션 전략

### 1. 스키마 마이그레이션 도구

**선택**: Sequelize Migrations

**이유**:
- 백엔드가 Sequelize ORM 사용
- 코드로 버전 관리 (Git)
- 롤백 가능

### 2. 마이그레이션 파일 구조

```
database/migrations/
├── 001_create_transactions_table.sql
├── 002_add_indexes.sql
├── 003_create_views.sql
└── 004_add_metadata_column.sql (향후)
```

**네이밍 규칙**: `{버전}_{설명}.sql`

### 3. 마이그레이션 실행

```bash
# 업 마이그레이션 (적용)
npm run migrate:up

# 다운 마이그레이션 (롤백)
npm run migrate:down

# 마이그레이션 상태 확인
npm run migrate:status
```

---

## 확장성 고려사항

### 단기 (1-6개월)
- **현재 아키텍처 유지**: 단일 PostgreSQL 인스턴스
- **모니터링 추가**: pg_stat_statements로 쿼리 성능 추적

### 중기 (6-12개월)
- **Read Replica 도입**: 읽기 쿼리 부하 분산
- **Redis 캐싱**: 잔여 수량 조회 결과 캐싱
- **Materialized View 전환**: 집계 쿼리 성능 향상

### 장기 (12개월+)
- **파티셔닝**: 월별 또는 분기별 파티션
- **Sharding**: 사용자별 데이터 분산 (사용자 1000명 이상 시)
- **CQRS 패턴**: 읽기/쓰기 데이터베이스 분리

---

## 부록

### A. 유용한 PostgreSQL 명령어

```sql
-- 테이블 크기 확인
SELECT pg_size_pretty(pg_total_relation_size('transactions'));

-- 인덱스 크기 확인
SELECT pg_size_pretty(pg_relation_size('idx_transactions_user_name'));

-- 느린 쿼리 확인 (pg_stat_statements 필요)
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- 데이터베이스 연결 수 확인
SELECT count(*) FROM pg_stat_activity;

-- 테이블 통계 업데이트
ANALYZE transactions;

-- 인덱스 재구성
REINDEX TABLE transactions;
```

---

### B. 성능 테스트 쿼리

```sql
-- 100만 건 더미 데이터 생성 (테스트용)
INSERT INTO transactions (user_name, type, quantity)
SELECT
  'User' || (random() * 100)::int,
  CASE WHEN random() > 0.5 THEN 'purchase' ELSE 'use' END,
  (random() * 10 + 1)::int
FROM generate_series(1, 1000000);

-- 쿼리 성능 측정
EXPLAIN ANALYZE SELECT * FROM balance_view;
EXPLAIN ANALYZE SELECT * FROM user_balance_view WHERE user_name = 'User42';
```

---

### C. 문제 해결 가이드

| 문제 | 원인 | 해결 방법 |
|------|------|-----------|
| 쿼리 느림 | 인덱스 미사용 | EXPLAIN ANALYZE로 확인 후 인덱스 추가 |
| 디스크 부족 | 오래된 데이터 축적 | 파티셔닝 + 아카이빙 |
| 연결 거부 | 최대 연결 수 초과 | max_connections 증가 또는 연결 풀 조정 |
| 잠금 대기 | 트랜잭션 충돌 | 격리 수준 조정 또는 쿼리 최적화 |

---

**문서 버전**: 1.0.0
**최종 업데이트**: 2024-02-05
**다음 리뷰 예정**: 2024-03-05 (월 1회)
