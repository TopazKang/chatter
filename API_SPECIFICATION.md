# API 명세서 (API Specification)

## 프로젝트: 회사 주차 관리 서비스

**버전**: 1.0.0
**베이스 URL**: `http://localhost:3000/api`
**프로토콜**: HTTP/HTTPS
**데이터 형식**: JSON

---

## 📋 목차
1. [개요](#개요)
2. [공통 사항](#공통-사항)
3. [엔드포인트 목록](#엔드포인트-목록)
4. [상세 명세](#상세-명세)
5. [에러 코드](#에러-코드)
6. [사용 예제](#사용-예제)

---

## 개요

이 API는 주차권 구매/사용 내역 관리를 위한 RESTful API입니다.

### 주요 기능
- ✅ 주차권 구매/사용 기록 생성
- ✅ 전체 거래 내역 조회
- ✅ 현재 잔여 주차권 수량 조회
- ✅ 특정 사용자의 거래 내역 조회

### API 설계 원칙
1. **RESTful**: HTTP 메서드와 상태 코드를 의미에 맞게 사용
2. **일관성**: 모든 응답이 동일한 구조를 따름
3. **예측 가능성**: URL 패턴과 동작이 직관적
4. **확장성**: 향후 기능 추가를 고려한 설계

---

## 공통 사항

### 요청 헤더 (Request Headers)

```http
Content-Type: application/json
Accept: application/json
```

### 응답 형식 (Response Format)

#### 성공 응답
```json
{
  "success": true,
  "data": {
    // 실제 데이터
  }
}
```

#### 에러 응답
```json
{
  "success": false,
  "error": "사용자 친화적인 에러 메시지",
  "errorCode": "ERROR_CODE",
  "details": {
    // 추가 정보 (개발 환경에서만)
  }
}
```

### HTTP 상태 코드

| 상태 코드 | 의미 | 사용 시점 |
|-----------|------|-----------|
| 200 OK | 성공 | GET 요청 성공 |
| 201 Created | 생성 완료 | POST 요청으로 리소스 생성 성공 |
| 400 Bad Request | 잘못된 요청 | 입력 검증 실패 |
| 404 Not Found | 리소스 없음 | 존재하지 않는 리소스 조회 |
| 500 Internal Server Error | 서버 오류 | 서버 내부 에러 |

---

## 엔드포인트 목록

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|-----------|------|-----------|
| POST | `/api/transactions` | 주차권 구매/사용 기록 생성 | ❌ |
| GET | `/api/transactions` | 전체 거래 내역 조회 | ❌ |
| GET | `/api/transactions/balance` | 현재 잔여 수량 조회 | ❌ |
| GET | `/api/transactions/user/:name` | 특정 사용자 거래 내역 조회 | ❌ |

> **참고**: 현재 버전은 인증 기능이 없습니다. 향후 JWT 기반 인증을 추가할 수 있습니다.

---

## 상세 명세

### 1. 주차권 거래 생성 (Create Transaction)

주차권 구매 또는 사용 내역을 데이터베이스에 기록합니다.

#### 엔드포인트
```http
POST /api/transactions
```

#### 요청 본문 (Request Body)

```json
{
  "user_name": "string",    // 직원 이름 (필수, 2-100자)
  "type": "purchase|use",   // 거래 유형 (필수, 'purchase' 또는 'use')
  "quantity": number        // 수량 (필수, 1 이상의 정수)
}
```

**필드 상세:**

| 필드 | 타입 | 필수 | 제약 조건 | 설명 |
|------|------|------|-----------|------|
| `user_name` | string | ✅ | 2 ≤ 길이 ≤ 100 | 주차권을 구매/사용하는 직원 이름 |
| `type` | enum | ✅ | 'purchase' \| 'use' | 구매는 'purchase', 사용은 'use' |
| `quantity` | integer | ✅ | quantity > 0 | 구매/사용할 주차권 수량 |

#### 요청 예제

**구매 요청:**
```json
{
  "user_name": "김철수",
  "type": "purchase",
  "quantity": 10
}
```

**사용 요청:**
```json
{
  "user_name": "이영희",
  "type": "use",
  "quantity": 3
}
```

#### 성공 응답 (201 Created)

```json
{
  "success": true,
  "data": {
    "id": 123,
    "user_name": "김철수",
    "type": "purchase",
    "quantity": 10,
    "created_at": "2024-01-15T10:30:45.123Z"
  }
}
```

**응답 필드:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | integer | 생성된 거래의 고유 ID (자동 생성) |
| `user_name` | string | 직원 이름 |
| `type` | string | 거래 유형 ('purchase' 또는 'use') |
| `quantity` | integer | 수량 |
| `created_at` | ISO 8601 | 거래 생성 시간 (UTC) |

#### 에러 응답

**400 Bad Request - 필수 필드 누락:**
```json
{
  "success": false,
  "error": "필수 필드가 누락되었습니다.",
  "errorCode": "MISSING_REQUIRED_FIELDS",
  "details": {
    "missingFields": ["quantity"]
  }
}
```

**400 Bad Request - 잘못된 타입:**
```json
{
  "success": false,
  "error": "타입은 'purchase' 또는 'use'만 가능합니다.",
  "errorCode": "INVALID_TYPE"
}
```

**400 Bad Request - 잘못된 수량:**
```json
{
  "success": false,
  "error": "수량은 1 이상의 정수여야 합니다.",
  "errorCode": "INVALID_QUANTITY"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  "errorCode": "INTERNAL_SERVER_ERROR"
}
```

#### cURL 예제

```bash
# 구매 기록 생성
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "user_name": "김철수",
    "type": "purchase",
    "quantity": 10
  }'

# 사용 기록 생성
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "user_name": "이영희",
    "type": "use",
    "quantity": 3
  }'
```

---

### 2. 전체 거래 내역 조회 (Get All Transactions)

모든 직원의 주차권 구매/사용 내역을 조회합니다.

#### 엔드포인트
```http
GET /api/transactions
```

#### 쿼리 파라미터 (Query Parameters)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `limit` | integer | ❌ | 100 | 조회할 최대 개수 (1-1000) |
| `offset` | integer | ❌ | 0 | 건너뛸 개수 (페이지네이션) |
| `sort` | string | ❌ | 'created_at' | 정렬 기준 ('created_at', 'user_name') |
| `order` | string | ❌ | 'DESC' | 정렬 순서 ('ASC', 'DESC') |

#### 요청 예제

```http
GET /api/transactions?limit=50&offset=0&sort=created_at&order=DESC
```

#### 성공 응답 (200 OK)

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 125,
        "user_name": "박민수",
        "type": "use",
        "quantity": 2,
        "created_at": "2024-01-15T14:25:30.456Z"
      },
      {
        "id": 124,
        "user_name": "김철수",
        "type": "purchase",
        "quantity": 10,
        "created_at": "2024-01-15T10:30:45.123Z"
      },
      {
        "id": 123,
        "user_name": "이영희",
        "type": "use",
        "quantity": 3,
        "created_at": "2024-01-14T16:15:22.789Z"
      }
    ],
    "pagination": {
      "total": 150,        // 전체 거래 수
      "limit": 50,         // 요청한 limit
      "offset": 0,         // 요청한 offset
      "hasMore": true      // 다음 페이지 존재 여부
    }
  }
}
```

#### 에러 응답

**400 Bad Request - 잘못된 쿼리 파라미터:**
```json
{
  "success": false,
  "error": "limit은 1에서 1000 사이의 값이어야 합니다.",
  "errorCode": "INVALID_QUERY_PARAMETER"
}
```

#### cURL 예제

```bash
# 최근 10개 거래 조회
curl -X GET "http://localhost:3000/api/transactions?limit=10&order=DESC"

# 두 번째 페이지 조회 (11-20번째)
curl -X GET "http://localhost:3000/api/transactions?limit=10&offset=10"
```

---

### 3. 잔여 주차권 수량 조회 (Get Balance)

전체 직원의 주차권 구매/사용 내역을 집계하여 현재 잔여 수량을 반환합니다.

#### 엔드포인트
```http
GET /api/transactions/balance
```

#### 요청 예제

```http
GET /api/transactions/balance
```

#### 성공 응답 (200 OK)

```json
{
  "success": true,
  "data": {
    "totalPurchased": 150,   // 총 구매 수량
    "totalUsed": 87,         // 총 사용 수량
    "balance": 63,           // 현재 잔여 수량
    "lastUpdated": "2024-01-15T14:25:30.456Z"  // 마지막 거래 시간
  }
}
```

**필드 설명:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `totalPurchased` | integer | 모든 직원의 구매 수량 합계 |
| `totalUsed` | integer | 모든 직원의 사용 수량 합계 |
| `balance` | integer | 잔여 수량 (= totalPurchased - totalUsed) |
| `lastUpdated` | ISO 8601 | 가장 최근 거래의 시간 |

#### 계산 로직

```
balance = Σ(구매 수량) - Σ(사용 수량)

예시:
- 김철수: 구매 10개, 사용 3개
- 이영희: 구매 15개, 사용 5개
- 박민수: 구매 8개, 사용 2개

totalPurchased = 10 + 15 + 8 = 33
totalUsed = 3 + 5 + 2 = 10
balance = 33 - 10 = 23
```

#### 에러 응답

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "잔여 수량을 조회하는 중 오류가 발생했습니다.",
  "errorCode": "BALANCE_QUERY_ERROR"
}
```

#### cURL 예제

```bash
curl -X GET http://localhost:3000/api/transactions/balance
```

---

### 4. 특정 사용자 거래 내역 조회 (Get User Transactions)

특정 직원의 주차권 구매/사용 내역과 개인별 잔여 수량을 조회합니다.

#### 엔드포인트
```http
GET /api/transactions/user/:name
```

#### 경로 파라미터 (Path Parameters)

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `name` | string | ✅ | 조회할 직원 이름 (URL 인코딩 필요) |

> **중요**: 이름에 공백이나 특수문자가 있는 경우 URL 인코딩 필요
> 예: "김 철수" → "김%20철수"

#### 쿼리 파라미터 (Query Parameters)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `limit` | integer | ❌ | 50 | 조회할 최대 개수 |
| `offset` | integer | ❌ | 0 | 건너뛸 개수 |

#### 요청 예제

```http
GET /api/transactions/user/김철수
GET /api/transactions/user/김철수?limit=10&offset=0
```

#### 성공 응답 (200 OK)

```json
{
  "success": true,
  "data": {
    "userName": "김철수",
    "summary": {
      "totalPurchased": 50,    // 이 사용자의 총 구매 수량
      "totalUsed": 23,         // 이 사용자의 총 사용 수량
      "balance": 27            // 이 사용자의 잔여 수량
    },
    "transactions": [
      {
        "id": 125,
        "type": "use",
        "quantity": 3,
        "created_at": "2024-01-15T14:25:30.456Z"
      },
      {
        "id": 120,
        "type": "purchase",
        "quantity": 20,
        "created_at": "2024-01-10T09:15:00.000Z"
      },
      {
        "id": 115,
        "type": "purchase",
        "quantity": 30,
        "created_at": "2024-01-05T11:30:00.000Z"
      },
      {
        "id": 110,
        "type": "use",
        "quantity": 20,
        "created_at": "2024-01-03T13:45:00.000Z"
      }
    ],
    "pagination": {
      "total": 15,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

#### 에러 응답

**404 Not Found - 사용자 없음:**
```json
{
  "success": false,
  "error": "해당 사용자의 거래 내역이 없습니다.",
  "errorCode": "USER_NOT_FOUND"
}
```

**400 Bad Request - 잘못된 사용자 이름:**
```json
{
  "success": false,
  "error": "사용자 이름이 유효하지 않습니다.",
  "errorCode": "INVALID_USER_NAME"
}
```

#### cURL 예제

```bash
# 김철수의 전체 거래 내역 조회
curl -X GET http://localhost:3000/api/transactions/user/김철수

# URL 인코딩 버전
curl -X GET "http://localhost:3000/api/transactions/user/%EA%B9%80%EC%B2%A0%EC%88%98"

# 최근 5개만 조회
curl -X GET "http://localhost:3000/api/transactions/user/김철수?limit=5"
```

---

## 에러 코드

### 에러 코드 목록

| 에러 코드 | HTTP 상태 | 설명 | 해결 방법 |
|-----------|-----------|------|-----------|
| `MISSING_REQUIRED_FIELDS` | 400 | 필수 필드 누락 | 요청 본문에 모든 필수 필드 포함 |
| `INVALID_TYPE` | 400 | 잘못된 거래 타입 | type을 'purchase' 또는 'use'로 설정 |
| `INVALID_QUANTITY` | 400 | 잘못된 수량 | 수량을 1 이상의 정수로 설정 |
| `INVALID_USER_NAME` | 400 | 잘못된 사용자 이름 | 이름을 2-100자로 설정 |
| `INVALID_QUERY_PARAMETER` | 400 | 잘못된 쿼리 파라미터 | 파라미터 값을 허용 범위 내로 설정 |
| `USER_NOT_FOUND` | 404 | 사용자를 찾을 수 없음 | 존재하는 사용자 이름 입력 |
| `BALANCE_QUERY_ERROR` | 500 | 잔여 수량 조회 실패 | 서버 로그 확인 및 재시도 |
| `DATABASE_CONNECTION_ERROR` | 500 | 데이터베이스 연결 실패 | 데이터베이스 상태 확인 |
| `INTERNAL_SERVER_ERROR` | 500 | 서버 내부 오류 | 서버 로그 확인 및 관리자 문의 |

### 에러 응답 구조

```typescript
interface ErrorResponse {
  success: false;
  error: string;          // 사용자 친화적인 메시지
  errorCode: string;      // 위 표의 에러 코드
  details?: {             // 추가 정보 (선택적, 개발 환경에서만)
    [key: string]: any;
  };
}
```

---

## 사용 예제

### 시나리오 1: 주차권 구매 후 잔여 수량 확인

```javascript
// 1. 주차권 10개 구매
const purchaseResponse = await fetch('http://localhost:3000/api/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_name: '김철수',
    type: 'purchase',
    quantity: 10
  })
});

const purchaseData = await purchaseResponse.json();
console.log('구매 완료:', purchaseData.data);
// 출력: { id: 123, user_name: '김철수', type: 'purchase', quantity: 10, ... }

// 2. 현재 잔여 수량 확인
const balanceResponse = await fetch('http://localhost:3000/api/transactions/balance');
const balanceData = await balanceResponse.json();
console.log('현재 잔여 수량:', balanceData.data.balance);
// 출력: 63 (예시)
```

### 시나리오 2: 주차권 사용 및 개인 내역 확인

```javascript
// 1. 주차권 3개 사용
await fetch('http://localhost:3000/api/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_name: '이영희',
    type: 'use',
    quantity: 3
  })
});

// 2. 이영희의 거래 내역 조회
const userResponse = await fetch('http://localhost:3000/api/transactions/user/이영희');
const userData = await userResponse.json();

console.log('이영희 잔여:', userData.data.summary.balance);
console.log('거래 내역:', userData.data.transactions);
```

### 시나리오 3: 최근 거래 내역 조회

```javascript
// 최근 20개 거래 조회
const response = await fetch(
  'http://localhost:3000/api/transactions?limit=20&order=DESC'
);
const data = await response.json();

data.data.transactions.forEach(transaction => {
  const action = transaction.type === 'purchase' ? '구매' : '사용';
  console.log(
    `${transaction.user_name}님이 ${transaction.quantity}개 ${action} ` +
    `(${new Date(transaction.created_at).toLocaleString()})`
  );
});
```

### 시나리오 4: 에러 처리

```javascript
async function createTransaction(userName, type, quantity) {
  try {
    const response = await fetch('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: userName, type, quantity })
    });

    const data = await response.json();

    if (!data.success) {
      // 에러 응답 처리
      console.error('에러 발생:', data.error);
      console.error('에러 코드:', data.errorCode);

      // 에러 코드별 처리
      switch (data.errorCode) {
        case 'INVALID_QUANTITY':
          alert('수량을 1 이상으로 입력해주세요.');
          break;
        case 'MISSING_REQUIRED_FIELDS':
          alert('모든 필드를 입력해주세요.');
          break;
        default:
          alert('오류가 발생했습니다. 다시 시도해주세요.');
      }
      return null;
    }

    return data.data;
  } catch (error) {
    // 네트워크 오류 등
    console.error('네트워크 오류:', error);
    alert('서버에 연결할 수 없습니다.');
    return null;
  }
}

// 사용 예
const result = await createTransaction('김철수', 'purchase', 10);
if (result) {
  console.log('성공:', result);
}
```

---

## Postman Collection

API 테스트를 위한 Postman Collection 예제:

```json
{
  "info": {
    "name": "주차 관리 서비스 API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "주차권 구매",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"user_name\": \"김철수\",\n  \"type\": \"purchase\",\n  \"quantity\": 10\n}"
        },
        "url": { "raw": "http://localhost:3000/api/transactions" }
      }
    },
    {
      "name": "잔여 수량 조회",
      "request": {
        "method": "GET",
        "url": { "raw": "http://localhost:3000/api/transactions/balance" }
      }
    },
    {
      "name": "전체 거래 내역",
      "request": {
        "method": "GET",
        "url": { "raw": "http://localhost:3000/api/transactions?limit=50" }
      }
    },
    {
      "name": "사용자별 거래 내역",
      "request": {
        "method": "GET",
        "url": { "raw": "http://localhost:3000/api/transactions/user/김철수" }
      }
    }
  ]
}
```

---

## 향후 확장 계획

### Phase 2: 인증 기능 추가
```http
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me

# 인증 필요한 엔드포인트
Authorization: Bearer <JWT_TOKEN>
```

### Phase 3: 통계 기능
```http
GET /api/statistics/daily      # 일별 사용량
GET /api/statistics/monthly    # 월별 사용량
GET /api/statistics/top-users  # 최다 사용자
```

### Phase 4: 사용자 관리
```http
GET /api/users                 # 전체 사용자 목록
POST /api/users                # 사용자 등록
PUT /api/users/:id             # 사용자 정보 수정
DELETE /api/users/:id          # 사용자 삭제
```

---

## 참고 자료

- **HTTP 메서드**: [RFC 7231](https://tools.ietf.org/html/rfc7231)
- **상태 코드**: [HTTP Status Codes](https://httpstatuses.com/)
- **RESTful API 설계**: [REST API Tutorial](https://restfulapi.net/)
- **JSON 형식**: [JSON.org](https://www.json.org/)

---

**문서 버전**: 1.0.0
**최종 수정일**: 2024-01-15
**작성자**: 프로젝트 매니저
