# 시스템 아키텍처 설계 문서 (System Architecture Design)

## 프로젝트: 회사 주차 관리 서비스

---

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [아키텍처 패턴](#아키텍처-패턴)
3. [시스템 아키텍처 다이어그램](#시스템-아키텍처-다이어그램)
4. [컴포넌트 설계](#컴포넌트-설계)
5. [데이터 플로우](#데이터-플로우)
6. [보안 설계](#보안-설계)
7. [에러 핸들링 전략](#에러-핸들링-전략)
8. [성능 최적화 전략](#성능-최적화-전략)
9. [확장성 고려사항](#확장성-고려사항)

---

## 시스템 개요

### 시스템 목적
회사 임직원들이 주차권의 구매/사용 내역을 관리하고, 전체 잔여 주차권 수량을 실시간으로 확인할 수 있는 웹 기반 관리 시스템입니다.

### 핵심 기능
1. **주차권 구매 기록**: 직원 이름과 구매 수량을 입력하여 데이터베이스에 저장
2. **주차권 사용 기록**: 직원 이름과 사용 수량을 입력하여 데이터베이스에 저장
3. **잔여 수량 계산**: 전체 구매 수량 - 전체 사용 수량 = 잔여 수량 (실시간 집계)
4. **거래 내역 조회**: 전체 또는 특정 사용자의 거래 이력 조회

---

## 아키텍처 패턴

### 선택한 아키텍처: **3-Tier Architecture (3계층 아키텍처)**

```
┌─────────────────────────────────────────────────────────────┐
│                   Presentation Layer                         │
│              (프레젠테이션 계층 - 프론트엔드)                │
│                                                               │
│     React + TypeScript + Vite                                │
│     - UI 컴포넌트 렌더링                                      │
│     - 사용자 입력 처리                                        │
│     - API 호출 및 데이터 바인딩                              │
│                                                               │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/REST API
                        │ (JSON)
┌───────────────────────▼─────────────────────────────────────┐
│                   Application Layer                          │
│                (애플리케이션 계층 - 백엔드)                   │
│                                                               │
│     Node.js + Express.js                                     │
│     - 비즈니스 로직 처리                                      │
│     - API 엔드포인트 제공                                     │
│     - 데이터 검증 및 변환                                     │
│     - 에러 핸들링                                             │
│                                                               │
└───────────────────────┬─────────────────────────────────────┘
                        │ Sequelize ORM
                        │ (SQL Queries)
┌───────────────────────▼─────────────────────────────────────┐
│                    Data Layer                                │
│                  (데이터 계층 - 데이터베이스)                │
│                                                               │
│     PostgreSQL 15                                            │
│     - 트랜잭션 데이터 영속성 저장                            │
│     - ACID 트랜잭션 보장                                      │
│     - 집계 쿼리 실행                                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 아키텍처 선택 근거

#### 왜 3-Tier Architecture를 선택했는가?

1. **관심사의 분리 (Separation of Concerns)**
   - 각 계층이 독립적인 책임을 가지며, 변경 시 다른 계층에 영향을 최소화
   - 프론트엔드 개발자와 백엔드 개발자가 병렬로 작업 가능

2. **확장성 (Scalability)**
   - 각 계층을 독립적으로 스케일링 가능
   - 예: 트래픽 증가 시 백엔드 서버만 수평 확장 가능

3. **유지보수성 (Maintainability)**
   - 명확한 계층 구조로 코드 가독성 향상
   - 특정 계층의 기술 스택 변경 시 다른 계층에 미치는 영향 최소화

4. **재사용성 (Reusability)**
   - 백엔드 API를 다른 클라이언트(모바일 앱, CLI 등)에서도 재사용 가능

---

## 시스템 아키텍처 다이어그램

### 전체 시스템 구성도

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Browser                              │
│                         (사용자 브라우저)                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTP (Port 80)
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                       Nginx Web Server                               │
│                        (리버스 프록시)                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  - 정적 파일 서빙 (React 빌드 결과물)                       │   │
│  │  - /api/* 요청을 백엔드로 프록시                            │   │
│  │  - Gzip 압축                                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────────────────────┬────────────────────┬────────────────────────┘
                        │                    │
          정적 파일 서빙│                    │ API 요청 프록시
                        │                    │ (/api/*)
        ┌───────────────▼──────┐   ┌─────────▼──────────────────────┐
        │  Frontend Container  │   │    Backend Container           │
        │  (React App)         │   │    (Node.js + Express)         │
        │                      │   │                                │
        │  - React 18          │   │  ┌──────────────────────────┐ │
        │  - TypeScript        │   │  │   Routes Layer           │ │
        │  - Axios             │   │  │   (API 엔드포인트)       │ │
        │  - Components        │   │  └──────────┬───────────────┘ │
        │                      │   │             │                  │
        └──────────────────────┘   │  ┌──────────▼───────────────┐ │
                                   │  │   Controllers Layer      │ │
                                   │  │   (비즈니스 로직)        │ │
                                   │  └──────────┬───────────────┘ │
                                   │             │                  │
                                   │  ┌──────────▼───────────────┐ │
                                   │  │   Models Layer           │ │
                                   │  │   (Sequelize ORM)        │ │
                                   │  └──────────┬───────────────┘ │
                                   └─────────────┼──────────────────┘
                                                 │ SQL Queries
                                                 │ (Port 5432)
                                   ┌─────────────▼──────────────────┐
                                   │   Database Container           │
                                   │   (PostgreSQL 15)              │
                                   │                                │
                                   │  ┌──────────────────────────┐ │
                                   │  │  transactions 테이블     │ │
                                   │  │  - id, user_name, type,  │ │
                                   │  │    quantity, created_at  │ │
                                   │  └──────────────────────────┘ │
                                   │  ┌──────────────────────────┐ │
                                   │  │  Views (뷰)              │ │
                                   │  │  - balance_view          │ │
                                   │  │  - user_balance_view     │ │
                                   │  └──────────────────────────┘ │
                                   └────────────────────────────────┘
                                   │  Volume (영속성 보장)         │
                                   │  postgres_data                │
                                   └────────────────────────────────┘
```

### Docker Compose 네트워크 구성

```
┌──────────────────────────────────────────────────────────────┐
│                    Docker Network                            │
│                    (parking-network)                         │
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌────────────────┐  │
│  │  frontend   │    │  backend    │    │   database     │  │
│  │  :80        │◄───┤  :3000      │◄───┤   :5432        │  │
│  └─────────────┘    └─────────────┘    └────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
        │                    │                      │
        │                    │                      │
    Port 80             Port 3000              Port 5432
 (호스트 노출)        (선택적 노출)           (선택적 노출)
```

---

## 컴포넌트 설계

### 1. 프론트엔드 컴포넌트 구조

```
src/
├── components/
│   ├── TransactionForm.tsx           # 주차권 구매/사용 입력 폼
│   │   ├── [기능] 이름 입력 필드
│   │   ├── [기능] 구매/사용 선택 버튼
│   │   ├── [기능] 수량 입력 필드
│   │   ├── [기능] 제출 버튼
│   │   └── [상태] 입력 검증 및 에러 표시
│   │
│   ├── BalanceDisplay.tsx             # 잔여 주차권 수량 표시
│   │   ├── [기능] 총 구매 수량 표시
│   │   ├── [기능] 총 사용 수량 표시
│   │   ├── [기능] 현재 잔여 수량 표시 (강조)
│   │   └── [상태] 실시간 업데이트
│   │
│   ├── TransactionList.tsx            # 거래 내역 목록 (선택적)
│   │   ├── [기능] 최근 거래 내역 표시
│   │   ├── [기능] 사용자별 필터링
│   │   ├── [기능] 날짜별 정렬
│   │   └── [상태] 페이지네이션
│   │
│   └── ErrorBoundary.tsx              # 에러 경계 컴포넌트
│       └── [기능] React 에러 캐치 및 사용자 친화적 메시지 표시
│
├── services/
│   └── api.ts                         # API 호출 로직
│       ├── createTransaction()        # 주차권 구매/사용 API
│       ├── getTransactions()          # 전체 거래 내역 조회
│       ├── getBalance()               # 잔여 수량 조회
│       └── getUserTransactions()      # 사용자별 거래 조회
│
├── types/
│   └── Transaction.ts                 # TypeScript 타입 정의
│       ├── Transaction 인터페이스
│       ├── BalanceResponse 인터페이스
│       └── TransactionType enum
│
├── App.tsx                            # 메인 애플리케이션 컴포넌트
└── main.tsx                           # 애플리케이션 진입점
```

#### 주요 컴포넌트 책임 (Responsibility)

**TransactionForm 컴포넌트:**
- **책임**: 사용자 입력을 받아 API로 전송
- **상태 관리**:
  - `userName`: 입력된 사용자 이름
  - `type`: 'purchase' 또는 'use'
  - `quantity`: 입력된 수량
  - `isLoading`: API 호출 중 상태
  - `error`: 에러 메시지
- **검증 로직**:
  - 이름: 필수, 2자 이상 100자 이하
  - 수량: 필수, 1 이상의 정수
  - 타입: purchase 또는 use 중 하나

**BalanceDisplay 컴포넌트:**
- **책임**: 현재 주차권 잔여 수량을 실시간으로 표시
- **상태 관리**:
  - `balance`: 잔여 수량
  - `totalPurchased`: 총 구매 수량
  - `totalUsed`: 총 사용 수량
  - `isLoading`: 데이터 로딩 중 상태
- **업데이트 시점**:
  - 컴포넌트 마운트 시
  - TransactionForm 제출 성공 시 (이벤트 기반 또는 폴링)

---

### 2. 백엔드 레이어 구조

```
src/
├── config/
│   ├── database.js                    # 데이터베이스 연결 설정
│   │   ├── [기능] Sequelize 인스턴스 생성
│   │   ├── [기능] 연결 풀 설정
│   │   └── [기능] 재연결 로직
│   │
│   └── env.js                         # 환경 변수 관리
│       └── [기능] .env 파일 로드 및 검증
│
├── models/
│   └── Transaction.js                 # Sequelize 모델
│       ├── [스키마] id, user_name, type, quantity, created_at
│       ├── [검증] 타입 체크, 수량 양수 검증
│       └── [관계] 현재는 단일 테이블, 향후 User 모델과 관계 설정 가능
│
├── controllers/
│   └── transactionController.js      # 비즈니스 로직
│       ├── createTransaction()        # 트랜잭션 생성
│       │   └── [로직] 입력 검증 → DB 저장 → 응답
│       ├── getAllTransactions()       # 전체 조회
│       │   └── [로직] DB 조회 → 날짜순 정렬 → 응답
│       ├── getBalance()               # 잔여 수량 조회
│       │   └── [로직] SUM 집계 쿼리 → 계산 → 응답
│       └── getUserTransactions()      # 사용자별 조회
│           └── [로직] WHERE 절 필터링 → 응답
│
├── routes/
│   └── transactionRoutes.js           # Express 라우트 정의
│       ├── POST   /api/transactions
│       ├── GET    /api/transactions
│       ├── GET    /api/transactions/balance
│       └── GET    /api/transactions/user/:name
│
├── middlewares/
│   ├── errorHandler.js                # 전역 에러 핸들러
│   │   └── [기능] 에러 로깅 + 표준화된 에러 응답
│   │
│   ├── validator.js                   # 입력 검증 미들웨어
│   │   ├── validateTransaction()      # 트랜잭션 검증
│   │   └── validateUserName()         # 사용자 이름 검증
│   │
│   └── cors.js                        # CORS 설정
│       └── [기능] 프론트엔드 Origin 허용
│
└── app.js                             # Express 앱 진입점
    ├── [설정] 미들웨어 등록
    ├── [설정] 라우트 등록
    ├── [설정] 에러 핸들러 등록
    └── [설정] 서버 시작
```

#### 레이어 간 책임 분리

```
┌─────────────────────────────────────────────────────────────┐
│                      Routes Layer                            │
│  역할: HTTP 요청 라우팅 및 미들웨어 적용                     │
│  책임: URL 패턴 매칭, 요청 전처리                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                   Middlewares Layer                          │
│  역할: 요청/응답 전처리 및 검증                              │
│  책임: 입력 검증, CORS, 에러 핸들링                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                   Controllers Layer                          │
│  역할: 비즈니스 로직 실행                                    │
│  책임: 데이터 처리, 집계, 응답 생성                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                     Models Layer                             │
│  역할: 데이터베이스 추상화                                   │
│  책임: ORM 매핑, 쿼리 생성, 데이터 영속성                    │
└─────────────────────────────────────────────────────────────┘
```

**설계 철학: Single Responsibility Principle (단일 책임 원칙)**
- 각 레이어는 하나의 명확한 책임만 가짐
- 변경 사항이 발생할 때 해당 레이어만 수정
- 예: 검증 로직 변경 → Middlewares만 수정, 비즈니스 로직은 영향 없음

---

### 3. 데이터베이스 스키마 설계

#### ERD (Entity-Relationship Diagram)

```
┌─────────────────────────────────────────────────────────────┐
│                      transactions                            │
├─────────────────────────────────────────────────────────────┤
│  id                 SERIAL         PRIMARY KEY               │
│  user_name          VARCHAR(100)   NOT NULL                  │
│  type               VARCHAR(20)    NOT NULL CHECK(...)       │
│  quantity           INTEGER        NOT NULL CHECK(> 0)       │
│  created_at         TIMESTAMP      DEFAULT CURRENT_TIMESTAMP │
├─────────────────────────────────────────────────────────────┤
│  INDEXES:                                                    │
│    - idx_transactions_user_name (user_name)                 │
│    - idx_transactions_created_at (created_at DESC)          │
│    - idx_transactions_type (type)                           │
└─────────────────────────────────────────────────────────────┘
```

#### Views (집계용 뷰)

**balance_view:**
```sql
CREATE VIEW balance_view AS
SELECT
    SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) as total_purchased,
    SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END) as total_used,
    SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) -
    SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END) as balance
FROM transactions;
```

**왜 View를 사용하는가?**
- **성능**: 복잡한 집계 쿼리를 미리 정의하여 재사용
- **일관성**: 동일한 집계 로직을 여러 곳에서 사용할 때 일관성 보장
- **간결성**: 애플리케이션 코드에서 복잡한 SQL을 반복하지 않음

---

## 데이터 플로우

### 1. 주차권 구매 플로우 (Purchase Flow)

```
[사용자] → [TransactionForm]
              │
              │ 1. 이름, 수량 입력 + '구매' 선택
              │ 2. 유효성 검증 (클라이언트)
              │    - 이름: 2-100자
              │    - 수량: 1 이상의 정수
              ▼
          [api.createTransaction()]
              │
              │ 3. HTTP POST 요청
              │    URL: /api/transactions
              │    Body: {
              │      user_name: "김철수",
              │      type: "purchase",
              │      quantity: 10
              │    }
              ▼
      [Backend - Routes Layer]
              │
              │ 4. 라우트 매칭
              │    POST /api/transactions → transactionController.createTransaction
              ▼
   [Backend - Middlewares - Validator]
              │
              │ 5. 서버 측 유효성 검증
              │    - 필수 필드 존재 여부
              │    - 타입 검증 (purchase/use)
              │    - 수량 > 0
              │    ❌ 검증 실패 → 400 Bad Request
              ▼
  [Backend - Controllers - createTransaction]
              │
              │ 6. 비즈니스 로직 실행
              │    - Transaction 모델을 통해 DB 저장
              │    - 트랜잭션 커밋
              ▼
     [Database - PostgreSQL]
              │
              │ 7. INSERT INTO transactions
              │    (user_name, type, quantity, created_at)
              │    VALUES ('김철수', 'purchase', 10, NOW())
              │
              │ 8. 저장 성공 → 생성된 레코드 반환
              ▼
  [Backend - Controllers - createTransaction]
              │
              │ 9. 응답 생성
              │    Status: 201 Created
              │    Body: {
              │      success: true,
              │      data: {
              │        id: 123,
              │        user_name: "김철수",
              │        type: "purchase",
              │        quantity: 10,
              │        created_at: "2024-01-15T10:30:00Z"
              │      }
              │    }
              ▼
          [TransactionForm]
              │
              │ 10. 응답 처리
              │     - 성공 메시지 표시
              │     - 폼 초기화
              │     - BalanceDisplay 업데이트 트리거
              ▼
          [BalanceDisplay]
              │
              │ 11. 잔여 수량 재조회
              │     GET /api/transactions/balance
              │
              │ 12. 화면에 새로운 잔여 수량 표시
              ▼
          [사용자]
           (완료 메시지 확인)
```

### 2. 잔여 수량 조회 플로우 (Balance Query Flow)

```
[BalanceDisplay 컴포넌트 마운트]
              │
              │ 1. useEffect 훅 실행
              ▼
      [api.getBalance()]
              │
              │ 2. HTTP GET 요청
              │    URL: /api/transactions/balance
              ▼
  [Backend - Routes Layer]
              │
              │ 3. 라우트 매칭
              │    GET /api/transactions/balance → transactionController.getBalance
              ▼
 [Backend - Controllers - getBalance]
              │
              │ 4. 집계 쿼리 실행
              │    옵션 A: View 사용
              │      SELECT * FROM balance_view;
              │
              │    옵션 B: 직접 집계
              │      SELECT
              │        SUM(CASE WHEN type='purchase' THEN quantity ELSE 0 END),
              │        SUM(CASE WHEN type='use' THEN quantity ELSE 0 END)
              │      FROM transactions;
              ▼
    [Database - PostgreSQL]
              │
              │ 5. 집계 연산 실행
              │    - 모든 트랜잭션을 스캔
              │    - purchase 합계 계산
              │    - use 합계 계산
              │    - 차이 계산 (balance)
              │
              │ 6. 결과 반환
              │    {
              │      total_purchased: 100,
              │      total_used: 35,
              │      balance: 65
              │    }
              ▼
 [Backend - Controllers - getBalance]
              │
              │ 7. 응답 생성
              │    Status: 200 OK
              │    Body: {
              │      success: true,
              │      data: {
              │        totalPurchased: 100,
              │        totalUsed: 35,
              │        balance: 65
              │      }
              │    }
              ▼
      [BalanceDisplay]
              │
              │ 8. 상태 업데이트
              │    - setBalance(65)
              │    - setTotalPurchased(100)
              │    - setTotalUsed(35)
              │
              │ 9. 화면 렌더링
              ▼
         [사용자]
      (잔여 수량 65개 확인)
```

---

## 보안 설계

### 1. 입력 검증 (Input Validation)

#### 클라이언트 측 검증 (1차 방어선)
```typescript
// TransactionForm.tsx
const validateInput = (userName: string, quantity: number) => {
  if (!userName || userName.length < 2 || userName.length > 100) {
    return "이름은 2자 이상 100자 이하여야 합니다.";
  }
  if (!quantity || quantity < 1 || !Number.isInteger(quantity)) {
    return "수량은 1 이상의 정수여야 합니다.";
  }
  return null; // 검증 통과
};
```

**목적**: 사용자 경험 향상 (즉각적인 피드백)

#### 서버 측 검증 (2차 방어선 - 필수)
```javascript
// middlewares/validator.js
const validateTransaction = (req, res, next) => {
  const { user_name, type, quantity } = req.body;

  // 필수 필드 검증
  if (!user_name || !type || !quantity) {
    return res.status(400).json({
      success: false,
      error: "필수 필드가 누락되었습니다."
    });
  }

  // 타입 검증
  if (!['purchase', 'use'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: "타입은 'purchase' 또는 'use'만 가능합니다."
    });
  }

  // 수량 검증
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({
      success: false,
      error: "수량은 1 이상의 정수여야 합니다."
    });
  }

  // SQL Injection 방지 (Sequelize ORM 사용으로 자동 방지되지만 추가 검증)
  if (typeof user_name !== 'string') {
    return res.status(400).json({
      success: false,
      error: "잘못된 이름 형식입니다."
    });
  }

  next();
};
```

**목적**: 보안 (악의적인 입력 차단)

### 2. CORS (Cross-Origin Resource Sharing) 설정

```javascript
// middlewares/cors.js
const cors = require('cors');

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:80',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 3600 // Preflight 요청 캐시 시간
};

module.exports = cors(corsOptions);
```

**보안 원칙**:
- **화이트리스트 방식**: 허용된 Origin만 명시
- **최소 권한 원칙**: 필요한 HTTP 메서드만 허용

### 3. 환경 변수 관리

```bash
# .env 파일 (절대 Git에 커밋하지 않음)
POSTGRES_PASSWORD=securepassword123!@#
DATABASE_HOST=database
NODE_ENV=production
```

```javascript
// config/env.js
require('dotenv').config();

const requiredEnvVars = [
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`필수 환경 변수 ${varName}가 설정되지 않았습니다.`);
  }
});
```

**보안 원칙**:
- **비밀 정보 분리**: 코드에 하드코딩 금지
- **.gitignore 등록**: .env 파일은 버전 관리에서 제외
- **.env.example 제공**: 필요한 환경 변수 목록 문서화

### 4. SQL Injection 방지

**Sequelize ORM 사용으로 자동 방지:**
```javascript
// ❌ 취약한 코드 (Raw SQL)
const query = `SELECT * FROM transactions WHERE user_name = '${userName}'`;

// ✅ 안전한 코드 (Sequelize)
const transactions = await Transaction.findAll({
  where: { user_name: userName }
});
// Sequelize가 자동으로 파라미터화된 쿼리 생성
// SQL: SELECT * FROM transactions WHERE user_name = $1
// Params: [userName]
```

### 5. 에러 정보 노출 방지

```javascript
// middlewares/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err); // 서버 로그에만 전체 에러 기록

  // 프로덕션 환경에서는 상세 에러 정보 숨김
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.statusCode || 500).json({
    success: false,
    error: isDevelopment ? err.message : "서버 오류가 발생했습니다.",
    ...(isDevelopment && { stack: err.stack }) // 개발 환경에서만 스택 트레이스 포함
  });
};
```

**보안 원칙**:
- **최소 정보 노출**: 프로덕션 환경에서 내부 에러 정보 숨김
- **로깅**: 서버 측 로그에는 상세 정보 기록 (디버깅용)

---

## 에러 핸들링 전략

### 1. 에러 계층 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    Client-Side Errors                        │
│  - 네트워크 오류                                              │
│  - 입력 검증 실패                                             │
│  - React 컴포넌트 에러                                        │
│  처리: ErrorBoundary, try-catch, 사용자 친화적 메시지        │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    API Layer Errors                          │
│  - 400 Bad Request (잘못된 입력)                             │
│  - 404 Not Found (존재하지 않는 리소스)                      │
│  - 500 Internal Server Error (서버 오류)                     │
│  처리: HTTP 상태 코드 + 표준화된 JSON 응답                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                  Database Layer Errors                       │
│  - 연결 실패                                                  │
│  - 쿼리 실패                                                  │
│  - 제약 조건 위반                                             │
│  처리: 에러 로깅 + 재시도 로직 + 사용자에게 일반 메시지      │
└─────────────────────────────────────────────────────────────┘
```

### 2. 표준화된 에러 응답 형식

```typescript
// 성공 응답
{
  "success": true,
  "data": { /* 실제 데이터 */ }
}

// 에러 응답
{
  "success": false,
  "error": "사용자 친화적인 에러 메시지",
  "errorCode": "VALIDATION_ERROR", // 선택적, 에러 분류용
  "details": { /* 추가 정보, 개발 환경에서만 */ }
}
```

### 3. 프론트엔드 에러 처리 패턴

```typescript
// api.ts
export const createTransaction = async (data: TransactionInput) => {
  try {
    const response = await axios.post('/api/transactions', data);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // 서버에서 반환한 에러 메시지 사용
      const message = error.response?.data?.error || '알 수 없는 오류가 발생했습니다.';
      return { success: false, error: message };
    }
    // 네트워크 오류 등
    return { success: false, error: '네트워크 연결을 확인해주세요.' };
  }
};
```

### 4. 데이터베이스 연결 실패 처리

```javascript
// config/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(/* 설정 */);

// 연결 테스트 및 재시도 로직
const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('✅ 데이터베이스 연결 성공');
      return;
    } catch (error) {
      console.error(`❌ 데이터베이스 연결 실패 (시도 ${i + 1}/${retries})`);
      if (i < retries - 1) {
        console.log(`${delay / 1000}초 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error('데이터베이스 연결 실패: 최대 재시도 횟수 초과');
      }
    }
  }
};
```

**전략 근거**:
- **재시도 로직**: 일시적 네트워크 문제 극복
- **지수 백오프**: 과부하 방지 (선택적)
- **최대 재시도 제한**: 무한 루프 방지

---

## 성능 최적화 전략

### 1. 데이터베이스 최적화

#### 인덱스 전략
```sql
-- 자주 사용되는 쿼리 패턴에 인덱스 생성
CREATE INDEX idx_transactions_user_name ON transactions(user_name);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
```

**인덱스 선정 근거**:
- `user_name`: 사용자별 조회 시 성능 향상 (WHERE user_name = ?)
- `created_at DESC`: 최근 거래 내역 조회 시 정렬 성능 향상
- `type`: 타입별 집계 시 성능 향상 (WHERE type = 'purchase')

#### 집계 쿼리 최적화
```sql
-- View 사용으로 복잡한 집계 쿼리 재사용
CREATE VIEW balance_view AS
SELECT
  SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) as total_purchased,
  SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END) as total_used,
  SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) -
  SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END) as balance
FROM transactions;
```

**성능 고려**:
- 단일 테이블 스캔으로 모든 집계 완료
- CASE 문으로 타입별 조건부 합계 계산
- 향후 데이터가 많아지면 Materialized View 고려

### 2. 프론트엔드 최적화

#### 불필요한 리렌더링 방지
```typescript
// React.memo로 컴포넌트 메모이제이션
const BalanceDisplay = React.memo(({ balance, totalPurchased, totalUsed }) => {
  return (
    <div>
      <h2>잔여 주차권: {balance}개</h2>
      <p>총 구매: {totalPurchased}개</p>
      <p>총 사용: {totalUsed}개</p>
    </div>
  );
});
```

#### API 호출 최적화
```typescript
// Debounce를 사용한 과도한 API 호출 방지
const debouncedFetchBalance = useMemo(
  () => debounce(fetchBalance, 500),
  []
);
```

### 3. 네트워크 최적화

#### Gzip 압축 (Nginx)
```nginx
# nginx.conf
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

#### HTTP 캐싱 (선택적)
```javascript
// 정적 리소스 캐싱
app.use(express.static('public', {
  maxAge: '1d' // 1일간 브라우저 캐시
}));
```

---

## 확장성 고려사항

### 1. 수평 확장 (Horizontal Scaling)

```
         Load Balancer
              │
      ┌───────┼───────┐
      ▼       ▼       ▼
  Backend  Backend  Backend
   Node 1   Node 2   Node 3
      └───────┼───────┘
              │
         PostgreSQL
       (단일 마스터)
```

**확장 시 고려사항**:
- **Stateless 백엔드**: 세션 상태를 서버에 저장하지 않음
- **데이터베이스 연결 풀**: 각 백엔드 인스턴스가 적절한 연결 수 유지
- **로드 밸런서**: Nginx 또는 HAProxy 사용

### 2. 데이터베이스 확장

#### Read Replica (읽기 전용 복제본)
```
┌─────────────┐
│  Master DB  │ ◄─── 쓰기 (INSERT, UPDATE)
│ (Primary)   │
└──────┬──────┘
       │ 복제
   ┌───┴───┬───────┐
   ▼       ▼       ▼
Replica  Replica  Replica
  #1       #2       #3
   └───────┴───────┘
         │
      읽기 (SELECT)
```

**적용 시점**: 조회 쿼리가 쓰기 쿼리보다 훨씬 많을 때

### 3. 캐싱 전략 (향후)

```
[Client] ──► [Backend] ──► [Redis Cache] ──► [PostgreSQL]
                               │
                            (캐시 히트)
                               ▼
                           [Response]
```

**캐싱 대상**:
- `balance_view` 결과 (TTL: 5초)
- 사용자별 최근 거래 내역 (TTL: 1분)

**캐싱 무효화**:
- 새로운 트랜잭션 생성 시 관련 캐시 삭제

---

## 마치며

이 아키텍처 설계는 다음 원칙을 따릅니다:

1. **단순성 우선**: 과도한 엔지니어링을 피하고 현재 요구사항에 적합한 솔루션 선택
2. **확장 가능성**: 향후 성장을 대비한 구조 설계
3. **관심사의 분리**: 각 레이어와 컴포넌트가 명확한 책임을 가짐
4. **보안 우선**: 입력 검증, 에러 처리, 환경 변수 관리 등 보안 베스트 프랙티스 적용
5. **유지보수성**: 명확한 코드 구조와 문서화로 향후 유지보수 용이

**다음 단계**: 이 아키텍처를 바탕으로 백엔드와 프론트엔드 개발 시작
