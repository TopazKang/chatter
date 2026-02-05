# 데이터베이스 마이그레이션 가이드

## 개요

이 디렉토리는 PostgreSQL 데이터베이스 스키마의 버전 관리를 위한 마이그레이션 파일들을 포함합니다.

## 마이그레이션 파일 목록

| 파일명 | 설명 | 버전 |
|--------|------|------|
| `001_create_transactions_table.sql` | 거래 테이블 생성 | 1.0.0 |
| `002_add_indexes.sql` | 성능 최적화 인덱스 추가 | 1.0.0 |
| `003_create_views.sql` | 집계 뷰 생성 | 1.0.0 |

## 네이밍 규칙

```
{버전번호}_{설명}.sql
```

- **버전번호**: 3자리 숫자 (001, 002, 003, ...)
- **설명**: 스네이크 케이스 (snake_case)로 작성
- **예시**: `004_add_metadata_column.sql`

## 마이그레이션 실행 순서

마이그레이션은 **파일명 순서대로** 실행되어야 합니다:

1. ✅ `001_create_transactions_table.sql` - 테이블 생성
2. ✅ `002_add_indexes.sql` - 인덱스 추가 (테이블 존재 필요)
3. ✅ `003_create_views.sql` - 뷰 생성 (테이블 및 인덱스 존재 필요)

## 수동 실행 방법

### 1. Docker 컨테이너 내부에서 실행

```bash
# 컨테이너 접속
docker exec -it parking-db psql -U postgres -d parking_management

# 마이그레이션 실행 (psql 프롬프트에서)
\i /docker-entrypoint-initdb.d/migrations/001_create_transactions_table.sql
\i /docker-entrypoint-initdb.d/migrations/002_add_indexes.sql
\i /docker-entrypoint-initdb.d/migrations/003_create_views.sql
```

### 2. 호스트에서 실행

```bash
# PostgreSQL 컨테이너에 파일 복사 후 실행
docker exec -i parking-db psql -U postgres -d parking_management < database/migrations/001_create_transactions_table.sql
docker exec -i parking-db psql -U postgres -d parking_management < database/migrations/002_add_indexes.sql
docker exec -i parking-db psql -U postgres -d parking_management < database/migrations/003_create_views.sql
```

## 자동화된 마이그레이션 (향후 구현)

### Sequelize CLI 사용

```bash
# 마이그레이션 실행
npm run migrate

# 마이그레이션 롤백 (마지막 마이그레이션 취소)
npm run migrate:undo

# 특정 버전까지 롤백
npm run migrate:undo:all --to 002_add_indexes.sql

# 마이그레이션 상태 확인
npm run migrate:status
```

### package.json 스크립트 설정 예시

```json
{
  "scripts": {
    "migrate": "sequelize-cli db:migrate",
    "migrate:undo": "sequelize-cli db:migrate:undo",
    "migrate:status": "sequelize-cli db:migrate:status"
  }
}
```

## 마이그레이션 검증

### 1. 테이블 생성 확인

```sql
-- 테이블 목록 조회
\dt

-- 테이블 구조 확인
\d transactions

-- 예상 결과:
-- Column     | Type          | Nullable | Default
-- -----------|---------------|----------|--------
-- id         | integer       | not null | nextval('transactions_id_seq'::regclass)
-- user_name  | varchar(100)  | not null |
-- type       | varchar(20)   | not null |
-- quantity   | integer       | not null |
-- created_at | timestamp     |          | CURRENT_TIMESTAMP
```

### 2. 인덱스 생성 확인

```sql
-- 인덱스 목록 조회
\di

-- 또는 SQL로 확인
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'transactions';

-- 예상 결과:
-- indexname                    | indexdef
-- -----------------------------|----------
-- transactions_pkey            | CREATE UNIQUE INDEX ... (id)
-- idx_transactions_user_name   | CREATE INDEX ... (user_name)
-- idx_transactions_created_at  | CREATE INDEX ... (created_at DESC)
-- idx_transactions_type        | CREATE INDEX ... (type)
```

### 3. 뷰 생성 확인

```sql
-- 뷰 목록 조회
\dv

-- 또는 SQL로 확인
SELECT viewname FROM pg_views WHERE schemaname = 'public';

-- 예상 결과:
-- viewname
-- ------------------
-- balance_view
-- user_balance_view

-- 뷰 정의 확인
\d+ balance_view
```

### 4. 제약조건 확인

```sql
-- 테이블 제약조건 확인
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'transactions'::regclass;

-- 예상 결과:
-- conname                      | contype | pg_get_constraintdef
-- -----------------------------|---------|---------------------
-- transactions_pkey            | p       | PRIMARY KEY (id)
-- transactions_type_check      | c       | CHECK (type IN ('purchase', 'use'))
-- transactions_quantity_check  | c       | CHECK (quantity > 0)
```

## 롤백 가이드

각 마이그레이션 파일의 하단에 주석 처리된 **DOWN Migration** 섹션이 있습니다.

### 롤백 실행 예시

```sql
-- 003_create_views.sql 롤백
DROP VIEW IF EXISTS balance_view CASCADE;
DROP VIEW IF EXISTS user_balance_view CASCADE;

-- 002_add_indexes.sql 롤백
DROP INDEX IF EXISTS idx_transactions_user_name;
DROP INDEX IF EXISTS idx_transactions_created_at;
DROP INDEX IF EXISTS idx_transactions_type;

-- 001_create_transactions_table.sql 롤백 (주의: 데이터 삭제됨!)
DROP TABLE IF EXISTS transactions CASCADE;
```

**⚠️ 주의사항**:
- 롤백 시 데이터가 삭제될 수 있습니다
- 프로덕션 환경에서는 반드시 백업 후 롤백 수행
- 롤백은 역순으로 실행 (003 → 002 → 001)

## 새로운 마이그레이션 추가 방법

### 1. 파일 생성

```bash
# 다음 버전 번호 확인 (현재 최대 003)
# 새 파일 생성: 004_description.sql
touch database/migrations/004_add_metadata_column.sql
```

### 2. 파일 구조 템플릿

```sql
-- Migration: 004_add_metadata_column
-- Description: 거래에 메타데이터 JSON 필드 추가
-- Author: 개발자 이름
-- Date: YYYY-MM-DD

-- ============================================
-- UP Migration (변경 적용)
-- ============================================

ALTER TABLE transactions ADD COLUMN metadata JSONB;
COMMENT ON COLUMN transactions.metadata IS '추가 정보 저장용 JSON 필드';

-- ============================================
-- DOWN Migration (롤백)
-- ============================================

-- ALTER TABLE transactions DROP COLUMN metadata;
```

### 3. 마이그레이션 원칙

✅ **해야 할 것**:
- 각 마이그레이션은 **하나의 논리적 변경**만 수행
- UP과 DOWN 마이그레이션 모두 작성
- COMMENT 추가로 문서화
- IF EXISTS/IF NOT EXISTS 사용으로 멱등성 보장

❌ **하지 말아야 할 것**:
- 여러 개의 관련 없는 변경을 하나의 파일에 포함
- 롤백 불가능한 변경 (데이터 삭제 등)
- 기존 마이그레이션 파일 수정 (새 파일 생성)

## 환경별 마이그레이션

### 개발 환경 (로컬)

```bash
# Docker Compose로 전체 스택 시작 (init.sql이 자동 실행됨)
docker-compose up -d

# 또는 수동으로 마이그레이션 실행
npm run migrate
```

### 테스트 환경

```bash
# 테스트 데이터베이스 초기화
docker exec -i parking-db psql -U postgres -d parking_test < database/init.sql
```

### 프로덕션 환경

```bash
# 1. 백업 생성
pg_dump -U postgres -d parking_management -F c -f backup_before_migration.dump

# 2. 마이그레이션 실행
npm run migrate

# 3. 검증
npm run test

# 4. 문제 발생 시 롤백
pg_restore -U postgres -d parking_management -c backup_before_migration.dump
```

## 트러블슈팅

### 문제 1: 마이그레이션 실행 순서 오류

**증상**: 뷰 생성 시 "relation does not exist" 에러

**원인**: 테이블 생성 전에 뷰를 생성하려고 시도

**해결**:
```bash
# 올바른 순서로 재실행
psql ... < 001_create_transactions_table.sql
psql ... < 002_add_indexes.sql
psql ... < 003_create_views.sql
```

### 문제 2: 중복 실행 에러

**증상**: "relation already exists" 에러

**원인**: 이미 실행된 마이그레이션을 다시 실행

**해결**:
- `IF EXISTS` / `IF NOT EXISTS` 사용으로 멱등성 확보
- 또는 마이그레이션 상태 확인 후 실행

### 문제 3: 권한 부족 에러

**증상**: "permission denied" 에러

**원인**: 데이터베이스 사용자 권한 부족

**해결**:
```sql
GRANT ALL PRIVILEGES ON DATABASE parking_management TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
```

## 추가 자료

- [PostgreSQL 공식 문서 - DDL](https://www.postgresql.org/docs/15/ddl.html)
- [Sequelize Migrations](https://sequelize.org/docs/v6/other-topics/migrations/)
- [DATABASE_DESIGN.md](../DATABASE_DESIGN.md) - 데이터베이스 설계 문서
- [../init.sql](../init.sql) - 초기 스키마 통합 파일

---

**문서 버전**: 1.0.0
**최종 업데이트**: 2024-02-05
