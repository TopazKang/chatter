# 데이터베이스 디렉토리 가이드

## 📁 디렉토리 구조

```
database/
├── init.sql                          # Docker 초기화 스크립트 (자동 실행)
├── README.md                         # 이 파일
│
├── migrations/                       # 마이그레이션 파일
│   ├── README.md                     # 마이그레이션 가이드
│   ├── 001_create_transactions_table.sql
│   ├── 002_add_indexes.sql
│   ├── 003_create_views.sql
│   └── 004_add_stored_procedures.sql # 스토어드 프로시저/함수
│
├── seeds/                            # 시드 데이터 (개발/테스트용)
│   ├── README.md
│   └── 001_sample_transactions.sql
│
└── scripts/                          # 유틸리티 스크립트
    ├── performance_monitoring.sql    # 성능 모니터링 쿼리
    └── backup_restore.sh             # 백업/복구 자동화 스크립트
```

---

## 🚀 빠른 시작

### 1. Docker Compose로 데이터베이스 시작

```bash
# 프로젝트 루트에서 실행
docker-compose up -d db

# 데이터베이스 로그 확인
docker-compose logs -f db
```

### 2. 초기화 확인

Docker Compose 실행 시 `init.sql`이 자동으로 실행되어:
- ✅ `transactions` 테이블 생성
- ✅ 인덱스 3개 생성
- ✅ 뷰 2개 생성 (`balance_view`, `user_balance_view`)
- ✅ 샘플 데이터 5건 삽입

### 3. 데이터베이스 접속

```bash
# psql로 접속
docker exec -it parking-db psql -U parking_user -d parking_management

# 또는 로컬에서 접속
psql -h localhost -p 5432 -U parking_user -d parking_management
```

---

## 📊 주요 파일 설명

### `init.sql`

**목적**: Docker 컨테이너 시작 시 자동으로 데이터베이스 초기화

**실행 내용**:
1. `transactions` 테이블 생성
2. 성능 최적화 인덱스 생성
3. 집계 뷰 생성
4. 기본 샘플 데이터 삽입
5. 통계 정보 업데이트 (`ANALYZE`)

**주의사항**:
- Docker 볼륨이 존재하면 재실행되지 않음
- 재초기화가 필요한 경우:
  ```bash
  docker-compose down -v  # 볼륨 삭제
  docker-compose up -d    # 재시작
  ```

---

## 🔄 마이그레이션

### 마이그레이션 순서

마이그레이션은 반드시 순서대로 실행되어야 합니다:

1. `001_create_transactions_table.sql` - 기본 테이블 생성
2. `002_add_indexes.sql` - 인덱스 추가
3. `003_create_views.sql` - 뷰 생성
4. `004_add_stored_procedures.sql` - 스토어드 프로시저 추가 ⭐ **NEW**

### 수동 마이그레이션 실행

```bash
# Docker 컨테이너 내에서 실행
docker exec -i parking-db psql -U parking_user -d parking_management < database/migrations/001_create_transactions_table.sql

# 또는 로컬에서 실행
psql -h localhost -U parking_user -d parking_management -f database/migrations/001_create_transactions_table.sql
```

### 롤백 (다운 마이그레이션)

각 마이그레이션 파일 하단에 주석 처리된 `DROP` 문이 있습니다:

```sql
-- DROP TABLE IF EXISTS transactions CASCADE;
```

롤백이 필요한 경우 주석을 해제하고 실행하세요.

---

## 🆕 스토어드 프로시저 및 함수

### 1. `use_parking_ticket()` - 주차권 사용 (잔액 검증)

**목적**: Race Condition 방지 및 원자성 보장

**사용법**:
```sql
SELECT * FROM use_parking_ticket('김철수', 3);
```

**반환값**:
```
success | message                | transaction_id | current_balance
--------|------------------------|----------------|----------------
true    | 주차권 3개 사용 완료    |      15        |      52
```

**장점**:
- ✅ 동시성 제어: 여러 사용자가 동시에 사용해도 잔액 초과 사용 방지
- ✅ 입력 검증: 수량, 사용자 이름 자동 검증
- ✅ 트랜잭션 안전성: 잔액 확인 → 거래 생성을 하나의 트랜잭션으로 처리

---

### 2. `purchase_parking_ticket()` - 주차권 구매

**사용법**:
```sql
SELECT * FROM purchase_parking_ticket('이영희', 10);
```

**반환값**:
```
success | message                | transaction_id | current_balance
--------|------------------------|----------------|----------------
true    | 주차권 10개 구매 완료   |      16        |      62
```

---

### 3. `get_user_balance_safe()` - 사용자별 잔액 조회

**사용법**:
```sql
SELECT * FROM get_user_balance_safe('김철수');
```

**반환값**:
```
user_name | purchased | used | balance
----------|-----------|------|--------
김철수     |    10     |  3   |   7
```

---

### 4. `get_database_stats()` - 데이터베이스 통계

**사용법**:
```sql
SELECT * FROM get_database_stats();
```

**반환값**:
```
total_transactions | total_users | total_purchased | total_used | total_balance | last_transaction_time
-------------------|-------------|-----------------|------------|---------------|----------------------
       25          |      5      |       100       |     45     |      55       | 2024-02-05 14:30:00
```

---

## 📈 성능 모니터링

### 모니터링 쿼리 실행

```bash
# psql로 접속 후
\i database/scripts/performance_monitoring.sql
```

### 주요 모니터링 항목

#### 1. 기본 헬스 체크
- 데이터베이스 크기
- 활성 연결 수
- 테이블/인덱스 크기

#### 2. 인덱스 성능
- 인덱스 사용 통계
- 사용되지 않는 인덱스 찾기
- 인덱스 블로트 확인

#### 3. 쿼리 성능
- `EXPLAIN ANALYZE`로 쿼리 실행 계획 확인
- Slow Query 탐지

#### 4. 캐시 효율성
- 캐시 히트율 (95% 이상 권장)
- 디스크 I/O 통계

#### 5. 비즈니스 메트릭
- 시간대별 거래 분포
- 일별 거래 추이
- 활성 사용자 랭킹

### 일일 모니터링 권장 사항

```sql
-- 종합 헬스 체크 (섹션 8)
SELECT
    'Database Health Check' AS report_name,
    NOW() AS check_time,
    current_database() AS database_name,
    (SELECT COUNT(*) FROM transactions) AS total_transactions,
    (SELECT COUNT(DISTINCT user_name) FROM transactions) AS total_users,
    (SELECT balance FROM balance_view) AS current_balance,
    pg_size_pretty(pg_database_size(current_database())) AS database_size;
```

---

## 💾 백업 및 복구

### 백업 스크립트 사용법

```bash
# 실행 권한 확인
chmod +x database/scripts/backup_restore.sh

# 전체 백업
./database/scripts/backup_restore.sh backup

# 특정 테이블 백업
./database/scripts/backup_restore.sh backup-table transactions

# 백업 목록 조회
./database/scripts/backup_restore.sh list

# 복구
./database/scripts/backup_restore.sh restore ./backups/parking_management_full_20240205_103000.dump

# 오래된 백업 삭제 (30일 이전)
./database/scripts/backup_restore.sh cleanup
```

### 환경 변수 설정

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=parking_management
export DB_USER=parking_user
export DB_PASSWORD=parking_password_secure_123
export BACKUP_DIR=./backups
export BACKUP_RETENTION_DAYS=30
```

### Cron 자동 백업 설정

```bash
# crontab 편집
crontab -e

# 매일 새벽 2시 자동 백업
0 2 * * * /path/to/database/scripts/backup_restore.sh backup >> /var/log/backup.log 2>&1

# 매주 일요일 오래된 백업 삭제
0 3 * * 0 /path/to/database/scripts/backup_restore.sh cleanup >> /var/log/cleanup.log 2>&1
```

---

## 🌱 시드 데이터

### 개발 환경용 샘플 데이터

```bash
# psql로 접속 후
\i database/seeds/001_sample_transactions.sql
```

**포함된 데이터**:
- 10명의 사용자
- 다양한 거래 패턴 (소량/대량, 빈번/드물게)
- 총 약 25건의 샘플 거래

**주의사항**:
- ⚠️ 프로덕션 환경에서는 실행하지 마세요!
- 기존 샘플 데이터가 있으면 삭제 후 재삽입 (멱등성 보장)

---

## 🔧 유지보수

### 정기적으로 실행해야 할 작업

#### 1. 통계 정보 업데이트 (주 1회)

```sql
ANALYZE transactions;
```

**효과**: 쿼리 플래너가 최적의 실행 계획 수립

---

#### 2. VACUUM (월 1회)

```sql
-- 일반 VACUUM (Dead Rows 제거)
VACUUM transactions;

-- VACUUM FULL (디스크 공간 회수, 테이블 잠금 발생)
VACUUM FULL transactions;  -- 저사용 시간대에 실행
```

**효과**: 디스크 공간 절약, 성능 향상

---

#### 3. 인덱스 재구성 (분기 1회)

```sql
REINDEX TABLE transactions;
```

**효과**: 인덱스 블로트 제거, 조회 성능 향상

---

## 📚 추가 리소스

### 관련 문서
- [DATABASE_DESIGN.md](../DATABASE_DESIGN.md) - 상세 설계 근거
- [API_SPECIFICATION.md](../API_SPECIFICATION.md) - API 명세서
- [ARCHITECTURE.md](../ARCHITECTURE.md) - 시스템 아키텍처

### PostgreSQL 공식 문서
- [PostgreSQL 15 Documentation](https://www.postgresql.org/docs/15/)
- [Performance Tips](https://www.postgresql.org/docs/15/performance-tips.html)
- [Backup and Restore](https://www.postgresql.org/docs/15/backup.html)

---

## ❓ 문제 해결 (Troubleshooting)

### 1. 데이터베이스 연결 실패

**증상**: `FATAL: password authentication failed`

**해결**:
```bash
# .env 파일 확인
cat .env

# Docker 컨테이너 재시작
docker-compose restart db
```

---

### 2. 마이그레이션 실패

**증상**: `ERROR: relation "transactions" already exists`

**해결**:
```sql
-- 기존 테이블 확인
\dt

-- 필요 시 DROP 후 재생성
DROP TABLE IF EXISTS transactions CASCADE;
\i database/migrations/001_create_transactions_table.sql
```

---

### 3. 쿼리 성능 저하

**증상**: 조회가 느림

**진단**:
```sql
-- EXPLAIN ANALYZE로 실행 계획 확인
EXPLAIN ANALYZE SELECT * FROM balance_view;

-- 인덱스 사용 여부 확인
SELECT * FROM pg_stat_user_indexes WHERE tablename = 'transactions';
```

**해결**:
```sql
-- 통계 정보 업데이트
ANALYZE transactions;

-- 인덱스 재구성
REINDEX TABLE transactions;
```

---

### 4. 디스크 공간 부족

**증상**: `ERROR: could not extend file`

**해결**:
```sql
-- 테이블 크기 확인
SELECT pg_size_pretty(pg_total_relation_size('transactions'));

-- VACUUM FULL 실행 (저사용 시간대)
VACUUM FULL transactions;

-- 오래된 데이터 아카이빙 (선택 사항)
-- 백업 후 특정 기간 이전 데이터 삭제
```

---

## 📞 지원 및 문의

데이터베이스 관련 이슈는 다음을 참고하세요:

1. [DEVELOPMENT_LOG.md](../DEVELOPMENT_LOG.md) - 개발 과정 및 의사결정 기록
2. GitHub Issues - 버그 리포트 및 기능 요청
3. PostgreSQL 커뮤니티 - [https://www.postgresql.org/community/](https://www.postgresql.org/community/)

---

**최종 업데이트**: 2024-02-05
**작성자**: 백엔드 개발자 (시니어)
