# 프론트엔드 아키텍처 설계 문서

## 📋 프로젝트: 회사 주차 관리 서비스 - 프론트엔드

**작성자**: 시니어 프론트엔드 개발자
**작성일**: 2024
**버전**: 1.0.0

---

## 목차

1. [프론트엔드 아키텍처 개요](#프론트엔드-아키텍처-개요)
2. [기술 스택 및 선정 근거](#기술-스택-및-선정-근거)
3. [프로젝트 구조](#프로젝트-구조)
4. [컴포넌트 설계](#컴포넌트-설계)
5. [상태 관리 전략](#상태-관리-전략)
6. [API 연동 계층](#api-연동-계층)
7. [타입 시스템](#타입-시스템)
8. [스타일링 전략](#스타일링-전략)
9. [성능 최적화](#성능-최적화)
10. [접근성 (a11y)](#접근성-a11y)
11. [에러 처리 전략](#에러-처리-전략)
12. [테스트 전략](#테스트-전략)

---

## 프론트엔드 아키텍처 개요

### 아키텍처 패턴: **Component-Based Architecture + Layered Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                       Presentation Layer                     │
│                      (UI Components)                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Transaction  │  │   Balance    │  │ Transaction  │     │
│  │     Form     │  │   Display    │  │     List     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────┐
│                     Business Logic Layer                     │
│                    (Hooks & State Management)                │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │useTransaction│  │  useBalance  │  │  useToast    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘     │
│         │                  │                                 │
└─────────┼──────────────────┼─────────────────────────────────┘
          │                  │
┌─────────▼──────────────────▼─────────────────────────────────┐
│                      Data Access Layer                       │
│                       (API Service)                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            transactionApi.ts                         │   │
│  │  - createTransaction()                               │   │
│  │  - getTransactions()                                 │   │
│  │  - getBalance()                                      │   │
│  │  - getUserTransactions()                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ HTTP/REST
                            ▼
                    Backend API Server
```

### 설계 철학

#### 1. **관심사의 분리 (Separation of Concerns)**

**당위성**: 각 계층이 명확한 책임을 가지면 코드 유지보수성과 테스트 용이성이 향상됩니다.

- **Presentation Layer**: 오직 UI 렌더링과 사용자 상호작용 처리
- **Business Logic Layer**: 데이터 가공, 검증, 상태 관리
- **Data Access Layer**: API 통신 및 데이터 변환

**대안 검토**:
- ❌ **컴포넌트에 모든 로직 포함**: 코드 중복, 테스트 어려움, 재사용 불가
- ✅ **계층 분리**: 각 계층을 독립적으로 테스트, 재사용 가능

#### 2. **컴포넌트 기반 아키텍처 (Component-Based Architecture)**

**당위성**: React의 컴포넌트 모델을 최대한 활용하여 재사용성과 조합성을 극대화합니다.

```
App.tsx (Root)
  ├── Header.tsx (재사용 가능)
  ├── TransactionForm.tsx (단일 책임 - 입력만 처리)
  ├── BalanceDisplay.tsx (단일 책임 - 표시만 처리)
  ├── TransactionList.tsx (단일 책임 - 목록만 표시)
  └── ErrorBoundary.tsx (에러 처리)
```

**원칙**:
- 각 컴포넌트는 **하나의 명확한 책임**만 가짐 (SRP - Single Responsibility Principle)
- 컴포넌트는 **조합 가능**해야 함 (Composability)
- Props는 **타입 안전**해야 함 (TypeScript)

---

## 기술 스택 및 선정 근거

### 핵심 기술 스택

| 기술 | 버전 | 선정 근거 |
|------|------|-----------|
| **React** | 18.x | 가상 DOM을 통한 효율적 렌더링, 풍부한 생태계, 컴포넌트 재사용성 |
| **TypeScript** | 5.x | 타입 안정성, IDE 지원 향상, 런타임 에러 사전 방지 |
| **Vite** | 5.x | 빠른 개발 서버, HMR 성능 우수, 모던 빌드 도구 |
| **Axios** | 1.x | Promise 기반, 인터셉터 지원, 에러 처리 용이, 타임아웃 설정 |
| **Tailwind CSS** | 3.x | 유틸리티 우선, 일관된 디자인 시스템, 빠른 프로토타이핑 |

### 의사결정 근거 상세

#### 1. React 선택 이유

**당위성**:
- ✅ **컴포넌트 재사용성**: 작은 컴포넌트를 조합하여 복잡한 UI 구성
- ✅ **선언적 프로그래밍**: UI 상태를 명확하게 표현, 버그 감소
- ✅ **성능**: Virtual DOM을 통한 효율적인 DOM 업데이트
- ✅ **생태계**: 풍부한 라이브러리 및 커뮤니티 지원

**대안 검토**:
- ❌ **Vue.js**: 러닝 커브는 낮지만 대규모 프로젝트에서 React보다 생태계가 작음
- ❌ **Vanilla JavaScript**: 빠르지만 코드 재사용성과 유지보수성 낮음

#### 2. TypeScript 선택 이유

**당위성**:
- ✅ **타입 안정성**: 컴파일 타임에 에러 발견 → 런타임 버그 감소
- ✅ **IDE 지원**: 자동완성, 리팩토링, 타입 추론으로 개발 생산성 향상
- ✅ **문서화**: 타입 정의 자체가 API 문서 역할
- ✅ **협업**: 명확한 인터페이스로 팀원 간 의사소통 개선

**예제**:
```typescript
// ❌ JavaScript - 런타임 에러 가능
function createTransaction(data) {
  return api.post('/transactions', data);
}

// ✅ TypeScript - 컴파일 타임에 에러 발견
interface TransactionRequest {
  user_name: string;
  type: 'purchase' | 'use';
  quantity: number;
}

function createTransaction(data: TransactionRequest): Promise<Transaction> {
  return api.post<Transaction>('/transactions', data);
}
```

#### 3. Vite 선택 이유

**당위성**:
- ✅ **개발 속도**: 네이티브 ESM 기반으로 HMR 속도 매우 빠름
- ✅ **빌드 최적화**: Rollup 기반으로 프로덕션 번들 최적화
- ✅ **모던 브라우저 타겟팅**: 레거시 브라우저 지원 불필요 시 번들 사이즈 감소
- ✅ **TypeScript 기본 지원**: 추가 설정 없이 바로 사용 가능

**대안 검토**:
- ❌ **Create React App (CRA)**: Webpack 기반으로 빌드 속도 느림, 설정 변경 어려움
- ❌ **Next.js**: SSR 필요 없는 프로젝트에 과도한 기능

#### 4. Axios vs Fetch API

**Axios 선택 이유**:
- ✅ **인터셉터**: 요청/응답 전역 처리 (인증, 에러 핸들링)
- ✅ **자동 JSON 변환**: `res.json()` 호출 불필요
- ✅ **타임아웃 설정**: 쉬운 네트워크 타임아웃 관리
- ✅ **에러 처리**: HTTP 에러를 자동으로 reject

```typescript
// ✅ Axios - 간결하고 명확
try {
  const { data } = await axios.post('/api/transactions', payload);
  return data;
} catch (error) {
  // HTTP 에러를 자동으로 catch
  handleError(error);
}

// ❌ Fetch - 장황하고 에러 처리 복잡
try {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    // 수동으로 에러 처리 필요
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  return data;
} catch (error) {
  handleError(error);
}
```

#### 5. Tailwind CSS 선택 이유

**당위성**:
- ✅ **유틸리티 우선**: HTML을 벗어나지 않고 스타일링 가능
- ✅ **일관성**: 미리 정의된 스케일로 디자인 시스템 일관성 보장
- ✅ **프로덕션 최적화**: 사용하지 않는 CSS 자동 제거 (PurgeCSS)
- ✅ **반응형 디자인**: 간단한 접두사로 미디어 쿼리 적용

```tsx
// ✅ Tailwind - 간결하고 반응형 쉬움
<button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded md:py-3 md:px-6">
  Submit
</button>

// ❌ CSS-in-JS - 장황하고 반응형 복잡
const Button = styled.button`
  background-color: #3b82f6;
  color: white;
  font-weight: bold;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;

  &:hover {
    background-color: #1d4ed8;
  }

  @media (min-width: 768px) {
    padding: 0.75rem 1.5rem;
  }
`;
```

---

## 프로젝트 구조

### 디렉토리 구조

```
frontend/
├── public/                      # 정적 파일
│   └── favicon.ico
│
├── src/
│   ├── components/              # UI 컴포넌트
│   │   ├── TransactionForm.tsx  # 주차권 입력 폼 컴포넌트
│   │   ├── BalanceDisplay.tsx   # 잔여 수량 표시 컴포넌트
│   │   ├── TransactionList.tsx  # 거래 내역 목록 컴포넌트
│   │   ├── ErrorBoundary.tsx    # 에러 경계 컴포넌트
│   │   └── LoadingSpinner.tsx   # 로딩 표시 컴포넌트
│   │
│   ├── hooks/                   # 커스텀 훅
│   │   ├── useTransaction.ts    # 거래 관련 비즈니스 로직
│   │   ├── useBalance.ts        # 잔여 수량 관련 로직
│   │   └── useToast.ts          # 토스트 알림 로직
│   │
│   ├── services/                # API 통신 계층
│   │   ├── api.ts               # Axios 인스턴스 설정
│   │   └── transactionApi.ts    # 트랜잭션 API 함수
│   │
│   ├── types/                   # TypeScript 타입 정의
│   │   ├── Transaction.ts       # 트랜잭션 타입
│   │   ├── Balance.ts           # 잔여 수량 타입
│   │   └── ApiResponse.ts       # API 응답 타입
│   │
│   ├── utils/                   # 유틸리티 함수
│   │   ├── validation.ts        # 입력 검증 함수
│   │   └── formatters.ts        # 데이터 포맷팅 함수
│   │
│   ├── constants/               # 상수 정의
│   │   └── config.ts            # 설정 상수
│   │
│   ├── App.tsx                  # 루트 컴포넌트
│   ├── main.tsx                 # 진입점
│   └── index.css                # 글로벌 스타일
│
├── package.json
├── tsconfig.json                # TypeScript 설정
├── vite.config.ts               # Vite 설정
├── tailwind.config.js           # Tailwind CSS 설정
├── postcss.config.js            # PostCSS 설정
└── .eslintrc.json               # ESLint 설정
```

### 디렉토리 설계 원칙

#### 1. **기능별 분리 (Feature-based Structure)**

**당위성**: 각 디렉토리가 명확한 역할을 가지며, 파일을 찾기 쉽습니다.

- `components/`: 순수 UI 컴포넌트만 포함
- `hooks/`: 재사용 가능한 비즈니스 로직
- `services/`: 외부 API 통신만 담당
- `types/`: TypeScript 타입 정의
- `utils/`: 순수 함수 (pure functions)

#### 2. **확장성 고려**

현재는 작은 프로젝트지만, 향후 확장을 대비한 구조:

```
// 현재 (작은 프로젝트)
src/components/TransactionForm.tsx

// 향후 확장 시
src/features/transactions/
  ├── components/
  │   ├── TransactionForm.tsx
  │   └── TransactionItem.tsx
  ├── hooks/
  │   └── useTransaction.ts
  └── types/
      └── Transaction.ts
```

---

## 컴포넌트 설계

### 1. TransactionForm 컴포넌트

**책임**: 주차권 구매/사용 입력 폼 제공

**설계 원칙**:
- ✅ **단일 책임**: 오직 사용자 입력만 처리
- ✅ **제어 컴포넌트**: React 상태로 폼 관리
- ✅ **클라이언트 검증**: 서버 요청 전 입력값 검증

**컴포넌트 구조**:
```tsx
interface TransactionFormProps {
  onSuccess?: () => void;  // 성공 시 콜백
  onError?: (error: string) => void;  // 에러 시 콜백
}

/**
 * 주차권 구매/사용 입력 폼 컴포넌트
 *
 * 기능:
 * - 사용자 이름 입력
 * - 구매/사용 선택 (라디오 버튼)
 * - 수량 입력
 * - 클라이언트 측 유효성 검증
 *
 * @example
 * <TransactionForm
 *   onSuccess={() => console.log('Success')}
 *   onError={(err) => console.error(err)}
 * />
 */
```

**상태 관리**:
```tsx
const [formData, setFormData] = useState({
  user_name: '',
  type: 'purchase' as 'purchase' | 'use',
  quantity: 1
});
const [errors, setErrors] = useState<Record<string, string>>({});
const [isSubmitting, setIsSubmitting] = useState(false);
```

**검증 규칙**:
- `user_name`: 필수, 2-50자, 한글/영문/숫자만 허용
- `type`: 'purchase' 또는 'use' 중 하나
- `quantity`: 필수, 1 이상의 정수

**UI 구성**:
```
┌─────────────────────────────────────┐
│  주차권 구매/사용                    │
├─────────────────────────────────────┤
│  이름: [____________________]        │
│  유형: ○ 구매  ● 사용               │
│  수량: [____] 개                    │
│                                     │
│           [제출하기]                 │
└─────────────────────────────────────┘
```

### 2. BalanceDisplay 컴포넌트

**책임**: 현재 잔여 주차권 수량 표시

**설계 원칙**:
- ✅ **읽기 전용**: 데이터 표시만 담당, 수정 불가
- ✅ **실시간 업데이트**: 데이터 변경 시 자동 갱신
- ✅ **시각적 피드백**: 잔여 수량에 따른 색상 변경

**컴포넌트 구조**:
```tsx
interface BalanceDisplayProps {
  autoRefresh?: boolean;  // 자동 갱신 여부
  refreshInterval?: number;  // 갱신 주기 (ms)
}

/**
 * 잔여 주차권 수량 표시 컴포넌트
 *
 * 기능:
 * - 총 구매 수량 표시
 * - 총 사용 수량 표시
 * - 현재 잔여 수량 표시 (강조)
 * - 자동 갱신 옵션
 *
 * @example
 * <BalanceDisplay autoRefresh={true} refreshInterval={5000} />
 */
```

**UI 구성**:
```
┌─────────────────────────────────────┐
│  현재 주차권 현황                    │
├─────────────────────────────────────┤
│  📦 총 구매: 150개                  │
│  🚗 총 사용: 87개                   │
│  ✅ 잔여 수량: 63개 (강조)          │
│                                     │
│  [새로고침] 마지막 업데이트: 방금 전 │
└─────────────────────────────────────┘
```

**색상 코드 (Tailwind CSS)**:
```tsx
// 잔여 수량에 따른 색상 변경
const getBalanceColor = (balance: number) => {
  if (balance >= 50) return 'text-green-600';  // 충분
  if (balance >= 20) return 'text-yellow-600'; // 경고
  return 'text-red-600';  // 부족
};
```

### 3. TransactionList 컴포넌트 (선택적)

**책임**: 거래 내역 목록 표시

**설계 원칙**:
- ✅ **가상 스크롤**: 대량 데이터 처리 시 성능 최적화
- ✅ **필터링**: 사용자별/유형별 필터링 가능
- ✅ **정렬**: 날짜/이름/수량 정렬

**컴포넌트 구조**:
```tsx
interface TransactionListProps {
  transactions?: Transaction[];  // 외부에서 데이터 주입
  showFilters?: boolean;  // 필터 UI 표시 여부
  pageSize?: number;  // 페이지당 항목 수
}

/**
 * 거래 내역 목록 컴포넌트
 *
 * 기능:
 * - 거래 내역 테이블 표시
 * - 사용자별/유형별 필터링
 * - 날짜순 정렬
 * - 페이지네이션
 *
 * @example
 * <TransactionList showFilters={true} pageSize={10} />
 */
```

**UI 구성**:
```
┌───────────────────────────────────────────────────────┐
│  거래 내역                                             │
├───────────────────────────────────────────────────────┤
│  필터: [전체▼]  유형: [전체▼]  정렬: [최신순▼]        │
├───────────────────────────────────────────────────────┤
│  이름     │  유형  │  수량  │  날짜              │     │
├───────────────────────────────────────────────────────┤
│  홍길동   │  구매  │  10개  │  2024-01-15 10:30  │     │
│  김철수   │  사용  │  2개   │  2024-01-15 09:15  │     │
│  ...                                                  │
├───────────────────────────────────────────────────────┤
│  < 이전   페이지 1/5   다음 >                         │
└───────────────────────────────────────────────────────┘
```

### 4. ErrorBoundary 컴포넌트

**책임**: React 컴포넌트 트리에서 발생한 에러 처리

**설계 원칙**:
- ✅ **에러 격리**: 일부 컴포넌트 에러가 전체 앱을 중단시키지 않음
- ✅ **사용자 친화적**: 기술적 에러 메시지 대신 이해하기 쉬운 메시지 표시
- ✅ **에러 로깅**: 프로덕션에서 에러 모니터링 (Sentry 등)

```tsx
/**
 * 에러 경계 컴포넌트
 *
 * React 컴포넌트 트리의 에러를 catch하여 fallback UI 표시
 *
 * @example
 * <ErrorBoundary fallback={<ErrorMessage />}>
 *   <App />
 * </ErrorBoundary>
 */
```

---

## 상태 관리 전략

### 선택: **React Hooks (useState, useEffect) + Custom Hooks**

**당위성**:
- ✅ 프로젝트 규모가 작아 전역 상태 관리 라이브러리 불필요
- ✅ 컴포넌트 간 데이터 공유가 적음 (부모-자식 props drilling 최소)
- ✅ 서버 상태는 API 호출로 동기화하므로 클라이언트 상태 최소화

**대안 검토**:
- ❌ **Redux**: 현재 프로젝트에 과도한 보일러플레이트
- ❌ **Zustand/Jotai**: 전역 상태가 거의 없어 불필요
- ✅ **React Query**: 향후 서버 상태 관리가 복잡해지면 도입 고려

### 상태 분류

#### 1. **로컬 상태 (Local State)** - `useState`

컴포넌트 내부에서만 사용되는 상태:

```tsx
// TransactionForm.tsx
const [formData, setFormData] = useState({
  user_name: '',
  type: 'purchase',
  quantity: 1
});
```

#### 2. **서버 상태 (Server State)** - Custom Hooks

API로부터 가져온 데이터:

```tsx
// hooks/useBalance.ts
export function useBalance() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const data = await transactionApi.getBalance();
      setBalance(data);
      setError(null);
    } catch (err) {
      setError('잔여 수량을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  return { balance, loading, error, refetch: fetchBalance };
}
```

#### 3. **UI 상태 (UI State)** - `useState`

로딩, 에러, 모달 표시 등:

```tsx
const [isSubmitting, setIsSubmitting] = useState(false);
const [showModal, setShowModal] = useState(false);
```

---

## API 연동 계층

### Axios 인스턴스 설정

**설계 원칙**:
- ✅ **중앙화**: 모든 API 요청이 동일한 설정 사용
- ✅ **인터셉터**: 요청/응답 전역 처리
- ✅ **에러 핸들링**: 일관된 에러 처리

```typescript
// services/api.ts

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Axios 인스턴스 생성
 *
 * 설정:
 * - baseURL: API 서버 주소
 * - timeout: 10초
 * - headers: JSON 요청
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 요청 인터셉터
 * - 로깅 (개발 환경)
 * - 인증 토큰 추가 (향후 확장)
 */
apiClient.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log('🚀 API Request:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 응답 인터셉터
 * - 표준 응답 형식 처리
 * - 전역 에러 핸들링
 */
apiClient.interceptors.response.use(
  (response) => {
    // 표준 응답 형식: { success: true, data: {...} }
    return response.data.data || response.data;
  },
  (error) => {
    // HTTP 에러 처리
    const errorMessage = error.response?.data?.error || '네트워크 오류가 발생했습니다.';

    if (import.meta.env.DEV) {
      console.error('❌ API Error:', errorMessage);
    }

    return Promise.reject(new Error(errorMessage));
  }
);
```

### Transaction API 서비스

```typescript
// services/transactionApi.ts

import { apiClient } from './api';
import type { Transaction, TransactionRequest, Balance } from '../types';

/**
 * 트랜잭션 API 서비스
 *
 * 모든 API 호출을 캡슐화하여 컴포넌트에서 직접 axios를 호출하지 않도록 함
 */
export const transactionApi = {
  /**
   * 주차권 구매/사용 기록 생성
   * @throws {Error} 검증 실패 또는 네트워크 에러
   */
  createTransaction: async (data: TransactionRequest): Promise<Transaction> => {
    return apiClient.post('/transactions', data);
  },

  /**
   * 전체 거래 내역 조회
   */
  getTransactions: async (): Promise<Transaction[]> => {
    return apiClient.get('/transactions');
  },

  /**
   * 현재 잔여 주차권 수량 조회
   */
  getBalance: async (): Promise<Balance> => {
    return apiClient.get('/transactions/balance');
  },

  /**
   * 특정 사용자의 거래 내역 조회
   */
  getUserTransactions: async (userName: string): Promise<Transaction[]> => {
    return apiClient.get(`/transactions/user/${encodeURIComponent(userName)}`);
  },
};
```

**당위성**:
- ✅ **추상화**: 컴포넌트는 API 세부사항을 알 필요 없음
- ✅ **타입 안정성**: 모든 함수가 명확한 타입 반환
- ✅ **테스트 용이성**: API 함수를 mock하기 쉬움
- ✅ **변경 용이성**: API 엔드포인트 변경 시 한 곳만 수정

---

## 타입 시스템

### TypeScript 타입 정의

**설계 원칙**:
- ✅ **백엔드 API와 동기화**: API 명세서와 일치하는 타입
- ✅ **엄격한 타입 체크**: `strict: true`
- ✅ **재사용성**: 공통 타입은 별도 파일로 분리

```typescript
// types/Transaction.ts

/**
 * 거래 유형
 * - purchase: 주차권 구매
 * - use: 주차권 사용
 */
export type TransactionType = 'purchase' | 'use';

/**
 * 거래 생성 요청 데이터
 *
 * POST /api/transactions 요청 body
 */
export interface TransactionRequest {
  user_name: string;
  type: TransactionType;
  quantity: number;
}

/**
 * 거래 응답 데이터
 *
 * API 응답에서 반환되는 거래 객체
 */
export interface Transaction {
  id: number;
  user_name: string;
  type: TransactionType;
  quantity: number;
  created_at: string;  // ISO 8601 형식
}

/**
 * 잔여 수량 응답 데이터
 *
 * GET /api/transactions/balance 응답
 */
export interface Balance {
  total_purchased: number;
  total_used: number;
  current_balance: number;
}

/**
 * API 표준 응답 형식
 *
 * 모든 API 응답이 따르는 공통 구조
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}
```

**타입 사용 예시**:
```tsx
// ✅ 타입 안전한 컴포넌트
interface TransactionFormProps {
  onSuccess?: (transaction: Transaction) => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState<TransactionRequest>({
    user_name: '',
    type: 'purchase',  // ✅ 'purchase' | 'use'만 허용
    quantity: 1
  });

  // ✅ 타입 추론으로 자동완성 지원
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await transactionApi.createTransaction(formData);
    onSuccess?.(result);  // ✅ Transaction 타입 보장
  };

  // ...
};
```

---

## 스타일링 전략

### Tailwind CSS 활용

**설계 철학**: **유틸리티 우선 + 컴포넌트 추상화**

#### 1. **기본 유틸리티 클래스 사용**

```tsx
// ✅ 간단한 컴포넌트는 인라인 클래스
<button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
  제출하기
</button>
```

#### 2. **재사용 가능한 컴포넌트로 추상화**

```tsx
// components/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  ...props
}) => {
  const baseClasses = 'font-bold rounded transition-colors';

  const variantClasses = {
    primary: 'bg-blue-500 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-500 hover:bg-gray-700 text-white',
    danger: 'bg-red-500 hover:bg-red-700 text-white',
  };

  const sizeClasses = {
    sm: 'py-1 px-2 text-sm',
    md: 'py-2 px-4',
    lg: 'py-3 px-6 text-lg',
  };

  const className = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`;

  return <button className={className} {...props}>{children}</button>;
};
```

#### 3. **Tailwind 설정 커스터마이징**

```javascript
// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          // ... 주요 색상 팔레트
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
      spacing: {
        '18': '4.5rem',  // 커스텀 간격
      },
    },
  },
  plugins: [],
};
```

**당위성**:
- ✅ **일관성**: 미리 정의된 스케일로 디자인 일관성 보장
- ✅ **생산성**: HTML을 벗어나지 않고 빠른 스타일링
- ✅ **최적화**: 사용하지 않는 CSS 자동 제거
- ✅ **반응형**: `md:`, `lg:` 접두사로 간단한 반응형 디자인

---

## 성능 최적화

### 1. React 렌더링 최적화

#### React.memo로 불필요한 리렌더링 방지

```tsx
// ✅ Props가 변경되지 않으면 리렌더링 방지
export const BalanceDisplay = React.memo<BalanceDisplayProps>(({ balance }) => {
  return (
    <div>
      <p>잔여 수량: {balance.current_balance}개</p>
    </div>
  );
});
```

**당위성**:
- 부모 컴포넌트가 리렌더링되어도 Props가 동일하면 자식은 리렌더링 안 함
- 특히 `BalanceDisplay`처럼 자주 변경되지 않는 데이터에 효과적

#### useCallback으로 함수 메모이제이션

```tsx
const handleSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();
  await createTransaction(formData);
}, [formData]);  // formData 변경 시에만 함수 재생성
```

### 2. 코드 스플리팅 (Lazy Loading)

```tsx
// App.tsx
const TransactionList = React.lazy(() => import('./components/TransactionList'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TransactionList />
    </Suspense>
  );
}
```

**당위성**:
- 초기 번들 사이즈 감소
- 사용자가 필요할 때만 코드 로드

### 3. 네트워크 최적화

#### API 요청 디바운싱

```tsx
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// 사용 예시: 검색 필터링
const debouncedSearchTerm = useDebounce(searchTerm, 500);
```

---

## 접근성 (a11y)

### WCAG 2.1 준수

#### 1. **시맨틱 HTML 사용**

```tsx
// ❌ 나쁜 예
<div onClick={handleSubmit}>제출</div>

// ✅ 좋은 예
<button onClick={handleSubmit}>제출</button>
```

#### 2. **ARIA 속성 추가**

```tsx
<input
  type="text"
  aria-label="사용자 이름"
  aria-required="true"
  aria-invalid={!!errors.user_name}
  aria-describedby={errors.user_name ? 'name-error' : undefined}
/>
{errors.user_name && (
  <p id="name-error" role="alert" className="text-red-500">
    {errors.user_name}
  </p>
)}
```

#### 3. **키보드 네비게이션 지원**

```tsx
// 모든 인터랙티브 요소에 키보드 접근 보장
<button
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleSubmit();
    }
  }}
>
  제출
</button>
```

#### 4. **색상 대비 (Contrast Ratio >= 4.5:1)**

```tsx
// Tailwind CSS 색상으로 충분한 대비 보장
<p className="text-gray-900 bg-white">  {/* ✅ 대비 21:1 */}
  높은 대비
</p>

<p className="text-gray-400 bg-white">  {/* ❌ 대비 2.5:1 */}
  낮은 대비 (피해야 함)
</p>
```

---

## 에러 처리 전략

### 3단계 에러 처리

```
[1단계] 클라이언트 검증 → 사용자 경험 향상
         ↓ (검증 통과)
[2단계] API 요청 → 서버 에러 처리
         ↓ (성공/실패)
[3단계] ErrorBoundary → 예상치 못한 에러 catch
```

#### 1단계: 클라이언트 검증

```tsx
// utils/validation.ts
export const validateTransactionForm = (data: TransactionRequest): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!data.user_name.trim()) {
    errors.user_name = '이름을 입력해주세요.';
  } else if (data.user_name.length < 2) {
    errors.user_name = '이름은 2자 이상이어야 합니다.';
  } else if (!/^[가-힣a-zA-Z0-9\s]+$/.test(data.user_name)) {
    errors.user_name = '이름은 한글, 영문, 숫자만 가능합니다.';
  }

  if (data.quantity < 1) {
    errors.quantity = '수량은 1개 이상이어야 합니다.';
  } else if (!Number.isInteger(data.quantity)) {
    errors.quantity = '수량은 정수만 가능합니다.';
  }

  return errors;
};
```

#### 2단계: API 에러 처리

```tsx
// hooks/useTransaction.ts
export function useTransaction() {
  const [error, setError] = useState<string | null>(null);

  const createTransaction = async (data: TransactionRequest) => {
    try {
      const result = await transactionApi.createTransaction(data);
      setError(null);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(message);
      throw err;
    }
  };

  return { createTransaction, error };
}
```

#### 3단계: ErrorBoundary

```tsx
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 프로덕션에서 에러 로깅 (Sentry 등)
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h2 className="text-red-800 font-bold">오류가 발생했습니다</h2>
          <p className="text-red-600">페이지를 새로고침해주세요.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 테스트 전략

### 테스트 피라미드

```
         ┌─────────────┐
         │  E2E 테스트  │  ← 소수의 핵심 시나리오
         └─────────────┘
       ┌─────────────────┐
       │ 통합 테스트      │  ← API 연동 테스트
       └─────────────────┘
   ┌───────────────────────┐
   │   단위 테스트          │  ← 유틸 함수, 훅 테스트
   └───────────────────────┘
```

### 1. 단위 테스트 (Vitest)

```tsx
// utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateTransactionForm } from './validation';

describe('validateTransactionForm', () => {
  it('빈 이름은 에러 반환', () => {
    const errors = validateTransactionForm({
      user_name: '',
      type: 'purchase',
      quantity: 1
    });

    expect(errors.user_name).toBe('이름을 입력해주세요.');
  });

  it('유효한 데이터는 에러 없음', () => {
    const errors = validateTransactionForm({
      user_name: '홍길동',
      type: 'purchase',
      quantity: 10
    });

    expect(errors).toEqual({});
  });
});
```

### 2. 컴포넌트 테스트 (React Testing Library)

```tsx
// components/TransactionForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionForm } from './TransactionForm';

describe('TransactionForm', () => {
  it('폼 제출 시 API 호출', async () => {
    const onSuccess = vi.fn();
    render(<TransactionForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '홍길동' } });
    fireEvent.change(screen.getByLabelText('수량'), { target: { value: '10' } });
    fireEvent.click(screen.getByText('제출하기'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
```

### 3. E2E 테스트 (Playwright - 선택적)

```typescript
// e2e/parking.spec.ts
import { test, expect } from '@playwright/test';

test('주차권 구매 플로우', async ({ page }) => {
  await page.goto('http://localhost:5173');

  await page.fill('input[name="user_name"]', '홍길동');
  await page.check('input[value="purchase"]');
  await page.fill('input[name="quantity"]', '10');
  await page.click('button[type="submit"]');

  await expect(page.locator('text=성공')).toBeVisible();
});
```

---

## 개발 워크플로우

### 1. 개발 환경 설정

```bash
# 프로젝트 초기화
npm create vite@latest . -- --template react-ts
npm install

# 의존성 설치
npm install axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 개발 서버 실행
npm run dev
```

### 2. 개발 → 테스트 → 빌드 사이클

```bash
# 개발 모드 (HMR 활성화)
npm run dev

# 타입 체크
npm run tsc

# 린트 검사
npm run lint

# 테스트 실행
npm run test

# 프로덕션 빌드
npm run build

# 프로덕션 빌드 프리뷰
npm run preview
```

### 3. Git 커밋 전 체크리스트

- [ ] TypeScript 컴파일 에러 없음 (`npm run tsc`)
- [ ] ESLint 경고 없음 (`npm run lint`)
- [ ] 모든 테스트 통과 (`npm run test`)
- [ ] 불필요한 console.log 제거
- [ ] 커밋 메시지 작성 (Conventional Commits)

---

## 배포 최적화

### 1. Vite 프로덕션 빌드 최적화

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'axios': ['axios'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // 프로덕션에서 console.log 제거
      },
    },
  },
});
```

### 2. Nginx 설정 (Docker)

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 향후 확장 계획

### 단기 (1-2주)
- [ ] 다크 모드 지원
- [ ] 로딩 스켈레톤 UI
- [ ] 토스트 알림 시스템

### 중기 (1-2개월)
- [ ] 사용자 인증 (JWT)
- [ ] 거래 내역 Excel 내보내기
- [ ] 실시간 업데이트 (WebSocket)

### 장기 (3-6개월)
- [ ] PWA (Progressive Web App) 전환
- [ ] 모바일 앱 (React Native)
- [ ] 관리자 대시보드

---

## 요약

### ✅ 핵심 설계 원칙

1. **관심사의 분리**: Presentation - Business Logic - Data Access 계층 분리
2. **컴포넌트 기반**: 재사용 가능한 작은 컴포넌트 조합
3. **타입 안정성**: TypeScript로 런타임 에러 최소화
4. **성능 최적화**: React.memo, useCallback, 코드 스플리팅
5. **접근성**: WCAG 2.1 준수
6. **에러 처리**: 3단계 방어선 (클라이언트 검증, API 에러, ErrorBoundary)

### 📊 기술적 의사결정 요약

| 결정 사항 | 선택 | 근거 |
|----------|------|------|
| UI 라이브러리 | React 18 | 컴포넌트 재사용성, 풍부한 생태계 |
| 타입 시스템 | TypeScript | 타입 안정성, IDE 지원, 협업 향상 |
| 빌드 도구 | Vite | 빠른 HMR, 모던 빌드 최적화 |
| HTTP 클라이언트 | Axios | 인터셉터, 자동 JSON 변환, 타임아웃 |
| 스타일링 | Tailwind CSS | 유틸리티 우선, 일관성, 프로덕션 최적화 |
| 상태 관리 | React Hooks | 프로젝트 규모에 적합, 추가 라이브러리 불필요 |

### 🚀 다음 단계

**프론트엔드 개발자가 수행할 작업**:

1. **환경 설정** (1시간)
   - Vite 프로젝트 초기화
   - 의존성 설치 (Axios, Tailwind CSS)
   - TypeScript 설정

2. **타입 정의** (1시간)
   - Transaction, Balance, ApiResponse 타입 작성

3. **API 서비스 계층** (2시간)
   - Axios 인스턴스 설정
   - transactionApi 함수 구현

4. **UI 컴포넌트 구현** (1-2일)
   - TransactionForm 컴포넌트
   - BalanceDisplay 컴포넌트
   - ErrorBoundary 컴포넌트

5. **통합 및 테스트** (1일)
   - 컴포넌트 통합
   - API 연동 테스트
   - 스타일링 완성

**예상 총 개발 기간**: 2-3일

---

**이 문서는 프론트엔드 구현의 모든 의사결정 근거를 포함하며, 개발자가 즉시 구현을 시작할 수 있는 상세한 가이드를 제공합니다.**
