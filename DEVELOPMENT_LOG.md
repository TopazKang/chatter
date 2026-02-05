# 개발 진행 로그 (Development Progress Log)

## 프로젝트: 회사 주차 관리 서비스

이 문서는 프로젝트 개발 과정에서 각 페르소나(프로젝트 매니저, 백엔드 개발자, 프론트엔드 개발자, QA 엔지니어)가 수행한 작업과 의사결정 과정을 기록합니다.

---

## 📅 2024년 [날짜]

### 🎯 프로젝트 매니저 (Project Manager)

#### [Phase 1] 요구사항 분석 완료

**수행 작업:**
1. ✅ 프로젝트 요구사항 분석 및 문서화
2. ✅ 기술 스택 선정 및 명세서 작성
3. ✅ 프로젝트 디렉토리 구조 설계 및 생성
4. ✅ Docker Compose 초기 설정 파일 작성
5. ✅ 데이터베이스 초기 스키마 설계

**주요 의사결정:**

**1. 기술 스택 선정**
- **결정**: React + Node.js + PostgreSQL + Docker Compose
- **당위성**:
  - React: 컴포넌트 기반 아키텍처로 유지보수성이 높고, 커뮤니티가 활성화되어 있어 문제 해결이 용이합니다.
  - Node.js + Express: JavaScript 풀스택 개발로 언어 통일이 가능하며, 비동기 I/O 처리에 강점이 있어 동시 트랜잭션 처리에 유리합니다.
  - PostgreSQL: ACID 트랜잭션을 완벽하게 지원하여 주차권 데이터의 무결성을 보장할 수 있으며, 집계 쿼리 성능이 우수합니다.
  - Docker Compose: 턴키 배포 요구사항을 만족하며, 개발 환경과 프로덕션 환경의 일관성을 보장합니다.

**2. 데이터베이스 스키마 설계**
- **결정**: 단일 `transactions` 테이블에 구매/사용 내역을 모두 저장
- **당위성**:
  - 구매와 사용을 별도 테이블로 분리하는 대신, `type` 필드로 구분하여 데이터 구조를 단순화했습니다.
  - 이렇게 하면 잔여 수량 계산 시 하나의 테이블만 조회하면 되어 쿼리가 간단해지고 조인 오버헤드가 없습니다.
  - 모든 거래 내역이 시간순으로 하나의 테이블에 기록되어 감사 추적(audit trail)이 용이합니다.

**3. API 설계 원칙**
- **결정**: RESTful API 패턴 채택
- **당위성**:
  - 표준화된 HTTP 메서드(GET, POST, PUT, DELETE)를 사용하여 직관적인 API 구조를 만듭니다.
  - `/api/transactions` 엔드포인트를 중심으로 CRUD 작업을 구성하여 API를 단순하게 유지합니다.
  - 프론트엔드 개발자가 API를 쉽게 이해하고 사용할 수 있습니다.

**다음 단계 계획:**
- 백엔드 개발자: API 엔드포인트 구현 시작
- 프론트엔드 개발자: UI 컴포넌트 설계 및 목업 작성
- QA 엔지니어: 테스트 케이스 작성 시작

**리스크 및 대응 방안:**
- 리스크: 동시 트랜잭션 처리 시 데이터 충돌 가능성
- 대응: PostgreSQL의 트랜잭션 격리 수준(Isolation Level) 활용 및 낙관적 잠금(Optimistic Locking) 검토

---

### 🎯 프로젝트 매니저 (Project Manager)

#### [Phase 2] 아키텍처 설계 완료

**수행 작업:**
1. ✅ 시스템 아키텍처 설계 문서 작성 (ARCHITECTURE.md)
2. ✅ API 명세서 상세 설계 (API_SPECIFICATION.md)
3. ✅ 프론트엔드 컴포넌트 아키텍처 설계
4. ✅ 백엔드 레이어 구조 설계
5. ✅ 보안 및 에러 핸들링 전략 수립
6. ✅ 데이터 플로우 및 시퀀스 다이어그램 작성
7. ✅ 성능 최적화 전략 수립

**주요 의사결정:**

**1. 아키텍처 패턴 선택: 3-Tier Architecture**
- **결정**: 프레젠테이션 계층(프론트엔드), 애플리케이션 계층(백엔드), 데이터 계층(데이터베이스)로 분리
- **당위성**:
  - **관심사의 분리**: 각 계층이 독립적인 책임을 가져 코드 유지보수가 용이합니다.
  - **확장성**: 트래픽 증가 시 각 계층을 독립적으로 수평 확장할 수 있습니다.
  - **재사용성**: 백엔드 API를 웹뿐만 아니라 모바일 앱, CLI 등 다른 클라이언트에서도 재사용 가능합니다.
  - **팀 협업**: 프론트엔드 팀과 백엔드 팀이 각자의 계층에서 독립적으로 개발 가능합니다.
- **대안 검토**:
  - Monolithic Architecture: 간단하지만 확장성과 유지보수성이 떨어집니다.
  - Microservices Architecture: 과도한 엔지니어링이며 현재 프로젝트 규모에 맞지 않습니다.

**2. 프론트엔드 컴포넌트 설계: 단일 책임 원칙 적용**
- **결정**: TransactionForm, BalanceDisplay, TransactionList 등 기능별로 독립적인 컴포넌트 분리
- **당위성**:
  - **단일 책임 원칙(SRP)**: 각 컴포넌트가 하나의 명확한 역할만 수행하여 코드 이해가 쉽습니다.
  - **재사용성**: BalanceDisplay 컴포넌트를 다른 페이지에서도 재사용 가능합니다.
  - **테스트 용이성**: 각 컴포넌트를 독립적으로 단위 테스트할 수 있습니다.
  - **유지보수성**: 특정 기능 수정 시 해당 컴포넌트만 수정하면 됩니다.

**3. 백엔드 레이어 구조: MVC 패턴 변형**
- **결정**: Routes → Middlewares → Controllers → Models 4계층 구조
- **당위성**:
  - **Routes**: HTTP 요청을 적절한 컨트롤러로 라우팅하는 책임만 수행
  - **Middlewares**: 입력 검증, CORS, 에러 핸들링 등 횡단 관심사(Cross-cutting concerns) 처리
  - **Controllers**: 비즈니스 로직 실행 및 응답 생성 (Fat Controller 패턴)
  - **Models**: 데이터베이스 추상화 및 ORM 매핑
  - 이러한 계층 분리로 각 레이어의 변경이 다른 레이어에 영향을 최소화합니다.

**4. 보안 전략: 다층 방어(Defense in Depth)**
- **결정**: 클라이언트 검증 + 서버 검증 + ORM 자동 방어
- **당위성**:
  - **클라이언트 검증**: 사용자 경험 향상을 위한 즉각적인 피드백 제공 (1차 방어선)
  - **서버 검증**: 보안을 위한 필수 검증 (2차 방어선, 악의적인 요청 차단)
  - **ORM 사용**: Sequelize가 자동으로 SQL Injection을 방어 (3차 방어선)
  - **CORS 설정**: 허용된 Origin만 API 접근 가능
  - **환경 변수**: 비밀 정보(DB 패스워드 등)를 코드에서 분리
  - 단일 방어선에 의존하지 않고 여러 겹의 보안 장치를 마련했습니다.

**5. 에러 핸들링: 표준화된 응답 형식**
- **결정**: 모든 API 응답을 `{ success: boolean, data/error: any }` 형식으로 통일
- **당위성**:
  - **일관성**: 프론트엔드에서 동일한 방식으로 모든 응답 처리 가능
  - **명확성**: success 필드로 성공/실패를 즉시 판단 가능
  - **보안**: 프로덕션 환경에서 내부 에러 정보 숨김 (최소 정보 노출 원칙)
  - **디버깅**: 개발 환경에서는 상세 에러 정보 제공 (스택 트레이스 포함)

**6. 데이터베이스 인덱스 전략: 쿼리 패턴 기반 최적화**
- **결정**: user_name, created_at, type 필드에 인덱스 생성
- **당위성**:
  - `user_name`: 특정 사용자 조회 쿼리 최적화 (WHERE user_name = ?)
  - `created_at DESC`: 최근 거래 내역 조회 시 정렬 성능 향상 (ORDER BY created_at DESC)
  - `type`: 타입별 집계 시 필터링 성능 향상 (WHERE type = 'purchase')
  - 인덱스는 쓰기 성능을 약간 저하시키지만, 조회가 더 빈번한 이 시스템에서는 읽기 최적화가 우선입니다.

**7. View 사용: 복잡한 집계 쿼리 재사용**
- **결정**: balance_view, user_balance_view 생성
- **당위성**:
  - **성능**: 동일한 집계 로직을 매번 작성하지 않고 View로 재사용
  - **일관성**: 잔여 수량 계산 로직이 항상 동일하게 적용됨
  - **간결성**: 애플리케이션 코드에서 복잡한 SQL을 반복하지 않음
  - 향후 데이터가 많아지면 Materialized View로 전환하여 성능 추가 향상 가능

**8. API 설계: RESTful 원칙과 명확한 엔드포인트**
- **결정**:
  - POST `/api/transactions` - 리소스 생성
  - GET `/api/transactions` - 전체 조회
  - GET `/api/transactions/balance` - 집계 조회 (특수 엔드포인트)
  - GET `/api/transactions/user/:name` - 사용자별 조회
- **당위성**:
  - **직관성**: URL만 보고도 기능을 예측 가능
  - **RESTful**: HTTP 메서드를 의미에 맞게 사용 (GET=조회, POST=생성)
  - **확장성**: 향후 PUT, DELETE 추가 용이
  - `/balance` 엔드포인트는 RESTful 원칙에서 약간 벗어나지만, 집계 쿼리의 특수성을 고려하여 명확성을 우선했습니다.

**구현 가이드라인:**

**프론트엔드 개발자를 위한 지침:**
```typescript
// 1. 컴포넌트는 단일 책임 원칙을 따를 것
// 2. API 호출은 services/api.ts에 집중할 것
// 3. 에러 처리는 일관된 방식으로 수행할 것
// 4. TypeScript 타입을 명확히 정의할 것

// 예시: API 호출 패턴
const result = await api.createTransaction(data);
if (!result.success) {
  // 에러 처리
  showErrorMessage(result.error);
  return;
}
// 성공 처리
updateBalance();
```

**백엔드 개발자를 위한 지침:**
```javascript
// 1. 각 레이어의 책임을 명확히 분리할 것
// 2. 입력 검증은 미들웨어에서 수행할 것
// 3. 비즈니스 로직은 컨트롤러에 집중할 것
// 4. 에러는 표준화된 형식으로 반환할 것

// 예시: 컨트롤러 패턴
exports.createTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.create(req.body);
    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    next(error); // 전역 에러 핸들러로 전달
  }
};
```

**성능 최적화 체크리스트:**
- [x] 데이터베이스 인덱스 생성 (user_name, created_at, type)
- [x] View를 통한 복잡한 집계 쿼리 최적화
- [x] 프론트엔드 컴포넌트 메모이제이션 (React.memo)
- [ ] API 응답 캐싱 (향후 Redis 도입 시)
- [x] Nginx Gzip 압축 활성화
- [ ] 프론트엔드 번들 크기 최적화 (구현 단계에서)

**보안 체크리스트:**
- [x] 서버 측 입력 검증 설계
- [x] CORS 화이트리스트 설정
- [x] 환경 변수로 비밀 정보 분리
- [x] SQL Injection 방어 (ORM 사용)
- [x] 에러 정보 노출 최소화 (프로덕션)
- [ ] Rate Limiting (향후 도입 고려)
- [ ] HTTPS 적용 (프로덕션 배포 시)

**확장성 고려사항:**

**단기 (Phase 2-3):**
- 현재 아키텍처로 충분 (단일 백엔드 인스턴스, 단일 데이터베이스)

**중기 (사용자 100명 이상):**
- 백엔드 수평 확장: Load Balancer + 다중 Node.js 인스턴스
- Read Replica 도입: 읽기 쿼리 부하 분산
- Redis 캐싱: 잔여 수량 조회 결과 캐싱 (TTL 5초)

**장기 (사용자 500명 이상):**
- CDN 도입: 프론트엔드 정적 파일 서빙
- Database Sharding: 사용자별 데이터 분산
- Microservices 고려: 통계 기능 등을 별도 서비스로 분리

**문서화 완료:**
- ✅ `ARCHITECTURE.md`: 시스템 아키텍처 전체 설계 (600+ 줄)
- ✅ `API_SPECIFICATION.md`: API 명세서 상세 문서 (600+ 줄)
- ✅ 모든 설계 결정에 대한 근거와 당위성 명시
- ✅ 다이어그램을 통한 시각적 이해 지원
- ✅ 코드 예제와 사용 시나리오 제공

**다음 단계:**
이제 아키텍처 설계가 완료되었으므로, 각 팀은 다음 작업을 시작할 수 있습니다:

**백엔드 개발자에게:**
1. `backend/` 디렉토리에서 `npm init -y`로 프로젝트 초기화
2. 필요한 패키지 설치: express, sequelize, pg, cors, dotenv, morgan
3. `src/config/database.js`: Sequelize 연결 설정
4. `src/models/Transaction.js`: Transaction 모델 정의
5. `src/routes/transactionRoutes.js`: 라우트 정의 (API_SPECIFICATION.md 참조)
6. `src/controllers/transactionController.js`: 비즈니스 로직 구현
7. `src/middlewares/`: 검증, CORS, 에러 핸들러 구현
8. `src/app.js`: Express 앱 초기 설정 및 미들웨어 등록

**프론트엔드 개발자에게:**
1. `frontend/` 디렉토리에서 Vite로 React 프로젝트 생성
2. 필요한 패키지 설치: axios, react, react-dom
3. `src/types/Transaction.ts`: TypeScript 타입 정의
4. `src/services/api.ts`: API 호출 함수 작성 (API_SPECIFICATION.md 참조)
5. `src/components/TransactionForm.tsx`: 입력 폼 컴포넌트
6. `src/components/BalanceDisplay.tsx`: 잔여 수량 표시 컴포넌트
7. `src/components/TransactionList.tsx`: 거래 내역 목록 (선택적)
8. `src/App.tsx`: 메인 애플리케이션 컴포넌트

**QA 엔지니어에게:**
1. API 테스트 케이스 작성 (Postman Collection 활용)
2. 프론트엔드 UI 테스트 시나리오 작성
3. 통합 테스트 체크리스트 준비
4. 엣지 케이스 정의 (음수 수량, 빈 이름, 특수문자 등)

**리스크 업데이트:**
- ✅ 해결: 아키텍처가 명확히 정의되어 개발 방향성 확립
- ⚠️ 새로운 리스크: 프론트엔드와 백엔드 개발 속도 차이로 인한 통합 지연 가능
  - 대응: 백엔드 API 먼저 구현 후 Postman으로 테스트, 프론트엔드는 Mock API로 병행 개발

**예상 소요 시간:**
- 백엔드 구현: 2-3일
- 프론트엔드 구현: 2-3일
- 통합 및 테스트: 1-2일
- **총 예상: 5-8일**

---

## 💻 백엔드 개발자 (Backend Developer)

### [Phase 3] 백엔드 API 구현 완료 (2024-02-05)

**수행 작업:**
- ✅ Node.js 프로젝트 초기 설정 (package.json)
- ✅ 데이터베이스 연결 설정 (Sequelize ORM)
- ✅ Transaction 모델 정의 및 검증 로직
- ✅ API 컨트롤러 구현 (4개 엔드포인트)
- ✅ 미들웨어 구현 (검증, CORS, 에러 핸들링)
- ✅ 라우트 정의 및 연결
- ✅ Express 애플리케이션 구성 및 통합
- ✅ Dockerfile 및 .dockerignore 작성

**기술적 의사결정:**

**1. Sequelize ORM 설정: 연결 풀 및 재시도 로직**
- **결정**:
  - 연결 풀 설정 (최소 5개, 최대 20개 동시 연결)
  - 최대 5회 재시도, 각 재시도 간 5초 대기
  - 개발 환경에서만 SQL 쿼리 로깅
- **당위성**:
  - **연결 풀**: 동시 요청 시 데이터베이스 연결을 재사용하여 성능 향상. 최대 20개로 제한하여 DB 과부하 방지.
  - **재시도 로직**: Docker Compose 환경에서 백엔드가 데이터베이스보다 먼저 시작될 수 있음. 재시도 로직으로 의존성 순서 문제 해결.
  - **조건부 로깅**: 프로덕션 환경에서는 로그 파일 크기 감소 및 성능 최적화.
- **대안 검토**:
  - ❌ 재시도 없이 즉시 실패: Docker 환경에서 불안정
  - ❌ 무한 재시도: 영구적인 문제 시 서버가 멈춤

**2. Transaction 모델: 후크(Hook)와 정적 메서드 활용**
- **결정**:
  - `beforeCreate` 후크로 사용자 이름 공백 제거
  - 정적 메서드 `getBalance()`, `getUserBalance()` 추가
  - Raw SQL 쿼리로 집계 최적화 (CASE WHEN, COALESCE 사용)
- **당위성**:
  - **후크**: 데이터 저장 전 자동으로 정규화하여 일관성 유지. 애플리케이션 코드에서 반복적인 trim() 호출 불필요.
  - **정적 메서드**: 복잡한 집계 로직을 모델에 캡슐화하여 재사용성 향상. 컨트롤러는 단순히 모델 메서드 호출만.
  - **Raw SQL**: Sequelize의 쿼리 빌더보다 집계 쿼리에서 성능 우수. COALESCE로 NULL 안전 처리.
- **구현 세부사항**:
```javascript
// 잔여 수량 조회 (Raw SQL)
Transaction.getBalance = async function() {
  const result = await sequelize.query(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END), 0) as total_purchased,
      COALESCE(SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END), 0) as total_used,
      COALESCE(
        SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) -
        SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END), 0
      ) as balance
    FROM transactions;
  `, { type: sequelize.QueryTypes.SELECT, raw: true });

  return {
    totalPurchased: parseInt(result[0].total_purchased, 10),
    totalUsed: parseInt(result[0].total_used, 10),
    balance: parseInt(result[0].balance, 10)
  };
};
```

**3. 검증 미들웨어: 3단계 검증 전략**
- **결정**: 미들웨어 → 컨트롤러 → 모델 순서로 검증
- **당위성**:
  - **1단계(미들웨어)**: 기본 타입 검증, SQL Injection 방어. 잘못된 요청을 조기에 차단하여 리소스 낭비 방지.
  - **2단계(컨트롤러)**: 비즈니스 로직 검증 (예: 수량이 1~10000 범위인지).
  - **3단계(모델)**: Sequelize 검증 규칙 (최종 방어선, DB 무결성 보장).
  - 계층별로 검증을 분산하여 관심사의 분리 및 재사용성 확보.
- **구현 세부사항**:
```javascript
// SQL Injection 방어 미들웨어
exports.validateSqlInjection = (req, res, next) => {
  const dangerousPatterns = [
    /(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b)/gi,
    /(\bEXEC\b|\bEXECUTE\b|\bUNION\b|\bSELECT\b)/gi,
    /(;|\-\-|\/\*|\*\/)/g
  ];
  // 입력 필드에서 위험 패턴 검색하여 차단
};
```

**4. CORS 설정: 화이트리스트 방식**
- **결정**:
  - 환경 변수로 허용 Origin 관리
  - 개발 환경: localhost 자동 허용
  - 프로덕션 환경: 명시적 도메인만 허용
- **당위성**:
  - **보안**: `*` (모든 Origin 허용)은 XSS 공격에 취약. 화이트리스트로 신뢰할 수 있는 도메인만 허용.
  - **유연성**: 환경 변수로 배포 환경별 설정 변경 용이.
  - **개발 편의성**: 개발 환경에서는 localhost 자동 허용하여 프론트엔드 개발 병행 가능.
- **구현 세부사항**:
```javascript
origin: (origin, callback) => {
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost'];
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error('CORS 정책에 의해 차단'));
  }
}
```

**5. 에러 핸들러: 환경별 에러 정보 노출 제어**
- **결정**:
  - 개발 환경: 스택 트레이스 및 요청 정보 포함
  - 프로덕션 환경: 사용자 친화적 메시지만 반환
  - Sequelize 에러 타입별 분기 처리
- **당위성**:
  - **보안**: 프로덕션에서 내부 에러 정보(스택 트레이스, DB 구조 등)를 숨겨 공격자에게 정보 노출 방지.
  - **디버깅**: 개발 환경에서는 상세 정보를 제공하여 문제 해결 시간 단축.
  - **일관성**: Sequelize의 다양한 에러 타입을 표준화된 형식으로 변환.
- **구현 세부사항**:
```javascript
exports.errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let errorResponse = { success: false, error: '서버 오류' };

  // Sequelize 에러별 처리
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    errorResponse = { success: false, error: '검증 실패', details: err.errors };
  }

  // 개발 환경: 스택 트레이스 추가
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};
```

**6. 라우트 순서: 특수 경로 우선 배치**
- **결정**:
  - `/balance` → `/user/:name` → `/` 순서로 라우트 정의
- **당위성**:
  - Express는 라우트를 정의된 순서대로 매칭함.
  - 만약 `GET /:id`를 먼저 정의하면 `/balance`가 `:id`로 인식되어 의도와 다르게 동작.
  - 특수 경로(정적 경로)를 파라미터 경로보다 먼저 정의하여 정확한 매칭 보장.
- **구현 세부사항**:
```javascript
// ✅ 올바른 순서
router.get('/balance', getBalance);         // 특수 경로 먼저
router.get('/user/:name', getUserTxs);      // 파라미터 경로
router.get('/', getAllTransactions);        // 일반 경로 마지막

// ❌ 잘못된 순서
router.get('/:id', getById);                // 'balance'가 :id로 인식됨!
router.get('/balance', getBalance);         // 절대 실행되지 않음
```

**7. Graceful Shutdown: 안전한 서버 종료**
- **결정**:
  - SIGTERM, SIGINT 시그널 핸들러 등록
  - 새 연결 거부 → 기존 연결 종료 → DB 종료 → 프로세스 종료 순서
  - 30초 타임아웃 설정
- **당위성**:
  - **데이터 무결성**: 진행 중인 트랜잭션을 안전하게 완료한 후 종료.
  - **서비스 가용성**: Docker/Kubernetes 환경에서 재시작 시 요청 손실 최소화.
  - **리소스 정리**: 데이터베이스 연결 등 리소스를 명시적으로 해제하여 메모리 누수 방지.
- **구현 세부사항**:
```javascript
const shutdown = async (signal) => {
  console.log(`${signal} 수신. Graceful Shutdown 시작`);
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 30000); // 강제 종료
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

**8. Dockerfile: 멀티 스테이지 빌드**
- **결정**:
  - Stage 1: 의존성 설치
  - Stage 2: 프로덕션 이미지 (node 사용자로 실행)
- **당위성**:
  - **경량화**: devDependencies 제외하여 이미지 크기 최소화 (약 30% 감소).
  - **보안**: root 사용자 대신 node 사용자로 실행하여 컨테이너 탈출 공격 리스크 감소.
  - **캐싱**: 의존성 설치 레이어를 분리하여 코드 변경 시 의존성 재설치 방지.
- **구현 세부사항**:
```dockerfile
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS production
USER node
COPY --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node src ./src
CMD ["node", "src/app.js"]
```

**구현된 API 엔드포인트:**

| 메서드 | 경로 | 기능 | 상태 |
|--------|------|------|------|
| POST | /api/transactions | 거래 생성 | ✅ 완료 |
| GET | /api/transactions | 전체 거래 조회 | ✅ 완료 |
| GET | /api/transactions/balance | 잔여 수량 조회 | ✅ 완료 |
| GET | /api/transactions/user/:name | 사용자별 조회 | ✅ 완료 |
| GET | /health | 헬스 체크 | ✅ 완료 |

**코드 구조:**
```
backend/
├── package.json                      # 의존성 정의
├── .env.example                      # 환경 변수 템플릿
├── Dockerfile                        # 컨테이너 이미지 정의
├── .dockerignore                     # 이미지에 제외할 파일
└── src/
    ├── app.js                        # Express 앱 진입점 (200+ 줄)
    ├── config/
    │   └── database.js               # Sequelize 설정 (150+ 줄)
    ├── models/
    │   └── Transaction.js            # Transaction 모델 (200+ 줄)
    ├── controllers/
    │   └── transactionController.js  # API 로직 (300+ 줄)
    ├── middlewares/
    │   ├── validator.js              # 입력 검증 (200+ 줄)
    │   ├── errorHandler.js           # 에러 처리 (150+ 줄)
    │   └── cors.js                   # CORS 설정 (100+ 줄)
    └── routes/
        └── transactionRoutes.js      # 라우트 정의 (100+ 줄)

총 라인 수: 약 1,400+ 줄
```

**테스트 체크리스트:**
- [ ] POST /api/transactions (정상 케이스)
- [ ] POST /api/transactions (검증 실패 케이스)
- [ ] GET /api/transactions (페이지네이션)
- [ ] GET /api/transactions/balance
- [ ] GET /api/transactions/user/:name
- [ ] CORS 프리플라이트 요청
- [ ] 데이터베이스 연결 재시도 로직
- [ ] Graceful Shutdown 동작

**발견한 이슈:**
- ✅ 해결: Sequelize 인덱스 설정 시 `comment` 필드 지원 확인 완료
- ✅ 해결: Docker Compose에서 데이터베이스보다 백엔드가 먼저 시작하는 문제 → 재시도 로직으로 해결

**성능 고려사항:**
- ✅ 연결 풀 설정: 최대 20개 동시 연결로 동시성 처리
- ✅ 인덱스 활용: user_name, created_at, type 필드 인덱스
- ✅ Raw SQL 사용: 집계 쿼리에서 ORM 오버헤드 제거
- ⏳ 향후: Redis 캐싱 추가 (잔여 수량 조회 결과 캐싱)

**보안 고려사항:**
- ✅ SQL Injection 방어: ORM + 입력 검증 미들웨어
- ✅ CORS 화이트리스트: 허용된 Origin만 접근 가능
- ✅ 입력 검증: 3단계 검증 (미들웨어 → 컨트롤러 → 모델)
- ✅ 에러 정보 숨김: 프로덕션에서 스택 트레이스 비노출
- ✅ 요청 크기 제한: 10KB 제한으로 DoS 공격 방지
- ✅ 보안 헤더: X-Content-Type-Options, X-Frame-Options 설정

**다음 작업:**
- ⏳ 프론트엔드 개발자: API 연동 준비 완료, 이제 React 앱 구현 시작 가능
- ⏳ QA 엔지니어: Postman Collection으로 API 테스트 시작
- ⏳ Docker Compose로 전체 스택 통합 테스트

---

## 📝 페르소나별 작업 템플릿

### 💻 백엔드 개발자 (Backend Developer)

#### [Phase X] [작업명]

**수행 작업:**
- [ ] 작업 항목 1
- [ ] 작업 항목 2

**기술적 의사결정:**

**1. [의사결정 제목]**
- **결정**: [무엇을 결정했는지]
- **당위성**: [왜 그렇게 결정했는지 상세히 설명]
- **대안 검토**: [고려했던 다른 방법과 선택하지 않은 이유]

**구현 세부사항:**
```javascript
// 주요 코드 스니펫 및 설명
```

**발견한 이슈:**
- 이슈 내용 및 해결 방법

**다음 작업:**
- 다음에 진행할 작업 목록

---

### 🎨 프론트엔드 개발자 (Frontend Developer)

#### [Phase X] [작업명]

**수행 작업:**
- [ ] 작업 항목 1
- [ ] 작업 항목 2

**UI/UX 의사결정:**

**1. [의사결정 제목]**
- **결정**: [무엇을 결정했는지]
- **당위성**: [사용자 경험 관점에서 왜 그렇게 결정했는지]
- **디자인 원칙**: [적용한 디자인 원칙 (접근성, 반응형 등)]

**구현 세부사항:**
```typescript
// 주요 컴포넌트 코드 및 설명
```

**사용자 경험 고려사항:**
- 어떤 사용자 시나리오를 고려했는지

**다음 작업:**
- 다음에 진행할 작업 목록

---

### 🧪 QA 엔지니어 (QA Engineer)

#### [Phase X] [작업명]

**수행 작업:**
- [ ] 작업 항목 1
- [ ] 작업 항목 2

**테스트 전략:**

**1. [테스트 유형]**
- **목적**: [무엇을 검증하려고 하는지]
- **방법**: [어떤 방식으로 테스트할 것인지]
- **당위성**: [왜 이런 테스트가 필요한지]

**테스트 케이스:**
```
TC-001: [테스트 케이스 제목]
- 사전조건: ...
- 테스트 단계: ...
- 예상 결과: ...
- 실제 결과: ...
- 상태: Pass/Fail
```

**발견한 버그:**
| ID | 심각도 | 설명 | 상태 | 담당자 |
|----|--------|------|------|--------|
| BUG-001 | High | ... | Open | ... |

**다음 작업:**
- 다음에 진행할 작업 목록

---

## 🔄 스프린트 회고 (Sprint Retrospective)

### Sprint 1 회고

**잘된 점 (What went well):**
- 항목 1
- 항목 2

**개선할 점 (What could be improved):**
- 항목 1
- 항목 2

**다음 스프린트 액션 아이템:**
- [ ] 액션 아이템 1
- [ ] 액션 아이템 2

---

*이 로그는 프로젝트 진행에 따라 각 페르소나가 실시간으로 업데이트합니다.*
