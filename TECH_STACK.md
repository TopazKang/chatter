# 기술 스택 명세서 (Technology Stack Specification)

## 프로젝트: 회사 주차 관리 서비스

---

## 최종 선정 기술 스택

### 🎨 프론트엔드 (Frontend)
- **프레임워크**: React 18.x
- **언어**: TypeScript
- **상태 관리**: React Hooks (useState, useEffect)
- **HTTP 클라이언트**: Axios
- **스타일링**: CSS3 / Tailwind CSS (선택적)
- **빌드 도구**: Vite

**선정 근거:**
- React는 컴포넌트 기반 구조로 재사용성이 높고 유지보수가 용이합니다.
- TypeScript를 통해 타입 안정성을 확보하여 런타임 에러를 줄일 수 있습니다.
- Vite는 빠른 개발 서버와 빌드 속도를 제공하여 개발 생산성을 높입니다.
- 간단한 프로젝트이므로 Redux 같은 복잡한 상태 관리 라이브러리 대신 React Hooks를 사용합니다.

### 🔧 백엔드 (Backend)
- **프레임워크**: Node.js + Express.js
- **언어**: JavaScript (ES6+) 또는 TypeScript
- **ORM**: Sequelize (PostgreSQL용)
- **인증**: 기본 인증 (향후 확장 가능)
- **로깅**: Morgan (HTTP 요청 로깅)
- **검증**: Express Validator

**선정 근거:**
- Node.js는 JavaScript 기반으로 프론트엔드와 언어 통일이 가능하여 풀스택 개발이 용이합니다.
- Express.js는 경량이면서도 유연한 웹 프레임워크로 RESTful API 구축에 적합합니다.
- Sequelize ORM을 사용하여 데이터베이스 쿼리를 추상화하고 마이그레이션 관리가 용이합니다.
- 비동기 I/O 처리에 강점이 있어 동시 요청 처리에 유리합니다.

### 💾 데이터베이스 (Database)
- **DBMS**: PostgreSQL 15.x
- **이유**:
  - ACID 트랜잭션 완벽 지원으로 데이터 무결성 보장
  - 동시성 제어 우수 (MVCC - Multi-Version Concurrency Control)
  - 오픈소스이며 안정성과 성능이 검증됨
  - 집계 함수(SUM, COUNT 등) 성능이 우수
  - JSON 타입 지원으로 향후 확장성 확보

**대안 고려사항:**
- MySQL: PostgreSQL과 유사하나 PostgreSQL이 동시성 제어 면에서 우수
- MongoDB: NoSQL의 유연성이 있으나 트랜잭션 무결성이 상대적으로 약함

### 🐳 컨테이너화 & 배포 (Containerization & Deployment)
- **컨테이너**: Docker
- **오케스트레이션**: Docker Compose
- **웹 서버**: Nginx (프론트엔드 정적 파일 서빙 및 프록시)

**Docker Compose 구성:**
```
services:
  - frontend (React app served by Nginx)
  - backend (Node.js + Express API server)
  - database (PostgreSQL)
```

**선정 근거:**
- Docker Compose를 통해 멀티 컨테이너 애플리케이션을 단일 명령으로 실행 가능
- 환경 일관성 보장 (개발, 스테이징, 프로덕션)
- 각 서비스의 격리와 독립적인 확장 가능
- Nginx를 리버스 프록시로 사용하여 프론트엔드와 백엔드를 통합

### 🧪 테스트 (Testing)
- **백엔드 테스트**: Jest + Supertest
- **프론트엔드 테스트**: Jest + React Testing Library
- **E2E 테스트**: (선택적) Playwright 또는 Cypress

---

## 프로젝트 구조 (Project Structure)

```
parking-management-service/
├── frontend/                    # React 프론트엔드
│   ├── public/
│   ├── src/
│   │   ├── components/          # React 컴포넌트
│   │   ├── services/            # API 호출 로직
│   │   ├── types/               # TypeScript 타입 정의
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # Node.js + Express 백엔드
│   ├── src/
│   │   ├── config/              # 설정 파일
│   │   ├── models/              # Sequelize 모델
│   │   ├── routes/              # Express 라우트
│   │   ├── controllers/         # 비즈니스 로직
│   │   ├── middlewares/         # 미들웨어
│   │   └── app.js               # Express 앱 진입점
│   ├── tests/                   # 테스트 파일
│   ├── Dockerfile
│   └── package.json
│
├── database/                    # 데이터베이스 관련 파일
│   ├── init.sql                 # 초기 스키마
│   └── migrations/              # Sequelize 마이그레이션
│
├── nginx/                       # Nginx 설정
│   └── nginx.conf
│
├── docker-compose.yml           # Docker Compose 설정
├── .env.example                 # 환경 변수 예시
├── .gitignore
└── README.md                    # 프로젝트 문서
```

---

## 환경 변수 설계 (Environment Variables)

```bash
# Database
POSTGRES_USER=parkingadmin
POSTGRES_PASSWORD=securepassword
POSTGRES_DB=parking_management
DATABASE_HOST=database
DATABASE_PORT=5432

# Backend
NODE_ENV=production
BACKEND_PORT=3000
API_PREFIX=/api

# Frontend
VITE_API_URL=http://localhost:3000/api
```

---

## 개발 도구 (Development Tools)

- **버전 관리**: Git
- **코드 에디터**: VSCode (권장)
- **API 테스트**: Postman 또는 Thunder Client
- **코드 포맷팅**: Prettier
- **린팅**: ESLint

---

## 향후 확장 고려사항

1. **인증/권한**: 현재는 단순 이름 입력이지만, 향후 JWT 기반 인증 추가 가능
2. **사용자 관리**: 직원 정보를 별도 테이블로 관리 (Users 테이블)
3. **통계 대시보드**: 일별/월별 주차권 사용 통계 시각화
4. **알림 기능**: 주차권 부족 시 이메일 또는 슬랙 알림
5. **모바일 앱**: React Native로 모바일 버전 개발
6. **로드 밸런싱**: 트래픽 증가 시 백엔드 인스턴스 복수 운영

---

*이 기술 스택은 프로젝트 요구사항과 확장성을 고려하여 선정되었습니다.*
