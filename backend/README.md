# 회사 주차 관리 서비스 - 백엔드 API

Node.js + Express + Sequelize 기반 RESTful API 서버입니다.

## 📋 목차

- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [시작하기](#시작하기)
- [API 엔드포인트](#api-엔드포인트)
- [환경 변수](#환경-변수)
- [개발 가이드](#개발-가이드)
- [테스트](#테스트)

## 🛠 기술 스택

- **런타임**: Node.js 18+
- **프레임워크**: Express.js 4.x
- **ORM**: Sequelize 6.x
- **데이터베이스**: PostgreSQL 15
- **보안**: CORS, SQL Injection 방어, 입력 검증
- **테스트**: Jest, Supertest

## 📁 프로젝트 구조

```
backend/
├── src/
│   ├── app.js                        # Express 앱 진입점
│   ├── config/
│   │   └── database.js               # Sequelize 연결 설정
│   ├── models/
│   │   └── Transaction.js            # Transaction 모델
│   ├── controllers/
│   │   └── transactionController.js  # API 비즈니스 로직
│   ├── middlewares/
│   │   ├── validator.js              # 입력 검증
│   │   ├── errorHandler.js           # 에러 처리
│   │   └── cors.js                   # CORS 설정
│   └── routes/
│       └── transactionRoutes.js      # API 라우트
├── tests/
│   └── api.test.js                   # API 통합 테스트
├── package.json
├── Dockerfile
└── .env.example
```

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 `.env`로 복사하고 값을 수정합니다:

```bash
cp .env.example .env
```

```env
# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=5432
DB_NAME=parking_management
DB_USER=parking_user
DB_PASSWORD=your_secure_password

# 서버 설정
PORT=3000
NODE_ENV=development

# CORS 설정
CORS_ORIGIN=http://localhost:80
```

### 3. 데이터베이스 준비

PostgreSQL이 실행 중이고 데이터베이스가 생성되어 있어야 합니다.

```sql
CREATE DATABASE parking_management;
CREATE USER parking_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE parking_management TO parking_user;
```

### 4. 서버 실행

```bash
# 개발 모드 (nodemon 사용)
npm run dev

# 프로덕션 모드
npm start
```

서버가 성공적으로 시작되면:
```
✅ 데이터베이스 연결 성공 (PostgreSQL)
✅ 데이터베이스 스키마 동기화 완료
✅ 서버 시작 완료!
🌐 서버 주소: http://localhost:3000
```

## 📡 API 엔드포인트

### 1. 거래 생성 (주차권 구매/사용)

```http
POST /api/transactions
Content-Type: application/json

{
  "user_name": "홍길동",
  "type": "purchase",    // "purchase" 또는 "use"
  "quantity": 10
}
```

**응답 (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_name": "홍길동",
    "type": "purchase",
    "quantity": 10,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. 전체 거래 내역 조회

```http
GET /api/transactions?limit=100&offset=0
```

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "transactions": [...],
    "pagination": {
      "limit": 100,
      "offset": 0,
      "total": 250,
      "hasMore": true
    }
  }
}
```

### 3. 현재 잔여 주차권 수량 조회

```http
GET /api/transactions/balance
```

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalPurchased": 100,
    "totalUsed": 35,
    "balance": 65
  }
}
```

### 4. 특정 사용자 거래 내역 조회

```http
GET /api/transactions/user/홍길동
```

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "userName": "홍길동",
    "balance": {
      "totalPurchased": 50,
      "totalUsed": 20,
      "balance": 30
    },
    "transactions": [...],
    "pagination": {
      "limit": 100,
      "offset": 0,
      "total": 15
    }
  }
}
```

### 5. 헬스 체크

```http
GET /health
```

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "database": "connected",
    "environment": "development"
  }
}
```

## 🔧 환경 변수

| 변수명 | 설명 | 기본값 | 필수 |
|--------|------|--------|------|
| `DB_HOST` | PostgreSQL 호스트 | localhost | ✅ |
| `DB_PORT` | PostgreSQL 포트 | 5432 | ✅ |
| `DB_NAME` | 데이터베이스 이름 | parking_management | ✅ |
| `DB_USER` | 데이터베이스 사용자 | parking_user | ✅ |
| `DB_PASSWORD` | 데이터베이스 비밀번호 | - | ✅ |
| `PORT` | 서버 포트 | 3000 | ❌ |
| `NODE_ENV` | 환경 (development/production) | development | ❌ |
| `CORS_ORIGIN` | CORS 허용 Origin | http://localhost:80 | ❌ |

## 👨‍💻 개발 가이드

### 코드 스타일

- ES6+ 문법 사용
- async/await 사용 (Promise 체이닝 최소화)
- 명확한 변수명 및 함수명
- 주석으로 복잡한 로직 설명

### 레이어 구조

```
Request → Routes → Middlewares → Controllers → Models → Database
```

각 레이어의 책임:
- **Routes**: HTTP 요청 라우팅
- **Middlewares**: 입력 검증, CORS, 에러 핸들링
- **Controllers**: 비즈니스 로직 처리
- **Models**: 데이터베이스 추상화

### 에러 처리

모든 에러는 표준화된 형식으로 반환됩니다:

```json
{
  "success": false,
  "error": "사용자 친화적인 에러 메시지",
  "errorCode": "ERROR_CODE",
  "details": {
    // 추가 정보 (개발 환경만)
  }
}
```

### 새로운 엔드포인트 추가 방법

1. **라우트 정의** (`routes/`)
2. **미들웨어 추가** (필요 시)
3. **컨트롤러 구현** (`controllers/`)
4. **모델 메서드 추가** (필요 시)
5. **테스트 작성** (`tests/`)

## 🧪 테스트

### 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 테스트 + 커버리지
npm test -- --coverage

# 특정 파일만 테스트
npm test -- api.test.js
```

### 테스트 작성 가이드

```javascript
describe('GET /api/transactions', () => {
  test('전체 거래 내역 조회 성공', async () => {
    const response = await request(app)
      .get('/api/transactions')
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

## 🐳 Docker

### 이미지 빌드

```bash
docker build -t parking-management-backend .
```

### 컨테이너 실행

```bash
docker run -p 3000:3000 \
  -e DB_HOST=database \
  -e DB_PASSWORD=your_password \
  parking-management-backend
```

## 🔒 보안

### 구현된 보안 기능

- ✅ **SQL Injection 방어**: Sequelize ORM + 입력 검증
- ✅ **CORS 화이트리스트**: 허용된 Origin만 접근
- ✅ **입력 검증**: 3단계 검증 (미들웨어 → 컨트롤러 → 모델)
- ✅ **에러 정보 최소화**: 프로덕션에서 내부 정보 숨김
- ✅ **요청 크기 제한**: 10KB 제한으로 DoS 방어
- ✅ **보안 헤더**: X-Content-Type-Options, X-Frame-Options

### 향후 추가 예정

- [ ] Rate Limiting (요청 속도 제한)
- [ ] JWT 기반 인증
- [ ] HTTPS 적용
- [ ] 입력 sanitization 강화

## 📈 성능 최적화

### 구현된 최적화

- ✅ **연결 풀**: 최대 20개 동시 연결
- ✅ **데이터베이스 인덱스**: user_name, created_at, type
- ✅ **Raw SQL 집계**: ORM 오버헤드 제거

### 향후 최적화 계획

- [ ] Redis 캐싱 (잔여 수량 조회)
- [ ] Response 압축 (Gzip)
- [ ] 쿼리 최적화 및 N+1 문제 해결

## 🤝 기여하기

1. 새로운 기능 구현 전 설계 문서 작성
2. 코드 작성 시 주석으로 의도 명확히
3. 테스트 케이스 필수 작성
4. 커밋 메시지에 변경 이유 포함

## 📝 라이센스

MIT License

## 📞 문의

- 프로젝트 문서: [ARCHITECTURE.md](../ARCHITECTURE.md)
- API 명세: [API_SPECIFICATION.md](../API_SPECIFICATION.md)
- 개발 로그: [DEVELOPMENT_LOG.md](../DEVELOPMENT_LOG.md)
