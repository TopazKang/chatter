# 회사 주차 관리 서비스 - 배포 가이드

> **DevOps 엔지니어 작성 문서**
> **작성일:** 2024-02-05
> **버전:** 1.0.0

---

## 📋 목차

1. [개요](#개요)
2. [시스템 요구사항](#시스템-요구사항)
3. [빠른 시작 (Quick Start)](#빠른-시작-quick-start)
4. [상세 배포 가이드](#상세-배포-가이드)
5. [환경 변수 설정](#환경-변수-설정)
6. [헬스체크 및 모니터링](#헬스체크-및-모니터링)
7. [백업 및 복구](#백업-및-복구)
8. [트러블슈팅](#트러블슈팅)
9. [프로덕션 배포 체크리스트](#프로덕션-배포-체크리스트)

---

## 개요

### 아키텍처 개요

```
┌─────────────────────────────────────────────────────────┐
│                      사용자 브라우저                      │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP (Port 80)
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Frontend (Nginx + React)                   │
│              - SPA 라우팅                                │
│              - 정적 파일 서빙                             │
│              - API 리버스 프록시                          │
└────────────────┬────────────────────────────────────────┘
                 │ Proxy: /api → backend:3000
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Backend (Node.js + Express)                │
│              - RESTful API                              │
│              - 비즈니스 로직                              │
│              - Sequelize ORM                            │
└────────────────┬────────────────────────────────────────┘
                 │ PostgreSQL Protocol (Port 5432)
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Database (PostgreSQL 15)                   │
│              - 트랜잭션 데이터                            │
│              - 스토어드 프로시저                          │
│              - 인덱스 최적화                              │
└─────────────────────────────────────────────────────────┘
```

### 배포 방식

- **턴키 방식 (Turnkey Deployment)**: `docker-compose up -d` 한 번으로 전체 스택 실행
- **컨테이너 오케스트레이션**: Docker Compose v3.8
- **Zero-Configuration**: 기본 설정으로 즉시 실행 가능
- **자동 헬스체크**: 각 서비스의 상태를 자동으로 모니터링

---

## 시스템 요구사항

### 하드웨어 요구사항

| 환경 | CPU | 메모리 | 디스크 |
|------|-----|--------|--------|
| **최소 사양** | 2 Core | 2 GB | 5 GB |
| **권장 사양** | 4 Core | 4 GB | 20 GB |
| **프로덕션** | 8 Core | 8 GB | 50 GB |

### 소프트웨어 요구사항

| 소프트웨어 | 최소 버전 | 권장 버전 | 확인 명령어 |
|-----------|----------|----------|-------------|
| **Docker** | 20.10+ | 24.0+ | `docker --version` |
| **Docker Compose** | 1.29+ | 2.20+ | `docker-compose --version` |
| **OS** | - | Ubuntu 20.04+ / RHEL 8+ / macOS 12+ | - |
| **포트** | 80, 3000, 5432 사용 가능 | - | `netstat -tuln` |

### 네트워크 요구사항

- **인바운드 포트**:
  - `80` (HTTP): 프론트엔드 웹 서버
  - `3000` (선택): 백엔드 API (개발 환경)
  - `5432` (선택): PostgreSQL (관리 목적)

- **아웃바운드**: Docker Hub 접근 가능 (이미지 다운로드)

---

## 빠른 시작 (Quick Start)

### 1단계: 프로젝트 클론

```bash
# Git 저장소 클론 (예시)
git clone https://github.com/your-org/parking-management.git
cd parking-management
```

### 2단계: 배포 스크립트 실행

```bash
# 실행 권한 부여
chmod +x deploy.sh healthcheck.sh

# 초기 설정
./deploy.sh init

# 이미지 빌드 및 서비스 시작
./deploy.sh build
./deploy.sh up
```

### 3단계: 접속 확인

```bash
# 웹 브라우저에서 접속
http://localhost        # 프론트엔드
http://localhost:3000/api/health  # 백엔드 API

# 또는 헬스체크 스크립트 실행
./healthcheck.sh
```

**🎉 배포 완료!** 이제 `http://localhost`에서 서비스를 사용할 수 있습니다.

---

## 상세 배포 가이드

### Step 1: 환경 준비

#### 1.1 Docker 설치 (미설치 시)

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

**macOS:**
```bash
# Docker Desktop 설치
brew install --cask docker
```

**Windows:**
- Docker Desktop for Windows 설치: https://docs.docker.com/desktop/windows/install/

#### 1.2 디렉토리 권한 확인

```bash
# 현재 사용자에게 디렉토리 소유권 부여
sudo chown -R $USER:$USER .
```

### Step 2: 환경 변수 설정

#### 2.1 .env 파일 생성

```bash
cp .env.example .env
```

#### 2.2 환경 변수 수정

```bash
# 텍스트 에디터로 .env 파일 열기
nano .env  # 또는 vim, code 등
```

**필수 수정 항목 (프로덕션):**

```env
# 데이터베이스 패스워드 (반드시 변경!)
POSTGRES_PASSWORD=your-strong-password-here

# CORS 허용 도메인
CORS_ORIGIN=https://yourdomain.com

# API URL (프로덕션 도메인)
VITE_API_URL=/api  # 상대 경로 권장
```

### Step 3: 이미지 빌드

#### 3.1 전체 빌드 (첫 배포)

```bash
./deploy.sh build
```

**또는 수동 빌드:**
```bash
docker-compose build --no-cache --parallel
```

#### 3.2 빌드 검증

```bash
# 빌드된 이미지 확인
docker images | grep parking

# 예상 출력:
# parking-backend     latest   ...   500MB
# parking-frontend    latest   ...   50MB
```

### Step 4: 서비스 시작

#### 4.1 백그라운드 실행

```bash
./deploy.sh up
```

**또는 수동 실행:**
```bash
docker-compose up -d
```

#### 4.2 포어그라운드 실행 (디버깅용)

```bash
docker-compose up
# Ctrl+C로 중지
```

#### 4.3 서비스 시작 확인

```bash
# 컨테이너 상태 확인
docker-compose ps

# 예상 출력:
# NAME                STATUS              PORTS
# parking-database    Up (healthy)        5432/tcp
# parking-backend     Up (healthy)        3000/tcp
# parking-frontend    Up (healthy)        80/tcp
```

### Step 5: 헬스체크

#### 5.1 자동 헬스체크 실행

```bash
./healthcheck.sh

# 상세 출력
./healthcheck.sh --verbose

# JSON 형식 출력
./healthcheck.sh --json
```

#### 5.2 수동 헬스체크

```bash
# 데이터베이스
docker-compose exec database pg_isready -U parkingadmin

# 백엔드 API
curl http://localhost:3000/health

# 프론트엔드
curl http://localhost/
```

#### 5.3 API 테스트

```bash
# 전체 잔액 조회
curl http://localhost:3000/api/transactions/balance

# 통계 조회
curl http://localhost:3000/api/transactions/stats

# 주차권 구매 (POST)
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"userName":"홍길동","type":"purchase","quantity":10}'
```

---

## 환경 변수 설정

### 주요 환경 변수

#### 데이터베이스 설정

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| `POSTGRES_USER` | `parkingadmin` | PostgreSQL 사용자 이름 |
| `POSTGRES_PASSWORD` | `securepassword` | PostgreSQL 패스워드 (⚠️ 변경 필수!) |
| `POSTGRES_DB` | `parking_management` | 데이터베이스 이름 |
| `POSTGRES_PORT` | `5432` | 외부 노출 포트 |

#### 백엔드 설정

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| `NODE_ENV` | `production` | 실행 환경 (development/production) |
| `BACKEND_PORT` | `3000` | 백엔드 API 포트 |
| `API_PREFIX` | `/api` | API 경로 접두사 |
| `CORS_ORIGIN` | `*` | CORS 허용 도메인 (⚠️ 프로덕션 변경) |
| `LOG_LEVEL` | `info` | 로그 레벨 (error/warn/info/debug) |

#### 프론트엔드 설정

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| `VITE_API_URL` | `http://localhost:3000/api` | API 엔드포인트 URL |
| `FRONTEND_PORT` | `80` | 프론트엔드 포트 |

### 환경별 설정 예시

#### 개발 환경

```env
NODE_ENV=development
CORS_ORIGIN=*
LOG_LEVEL=debug
VITE_API_URL=http://localhost:3000/api
```

#### 스테이징 환경

```env
NODE_ENV=production
CORS_ORIGIN=https://staging.yourdomain.com
LOG_LEVEL=info
VITE_API_URL=https://staging.yourdomain.com/api
```

#### 프로덕션 환경

```env
NODE_ENV=production
POSTGRES_PASSWORD=<강력한-패스워드>
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=warn
VITE_API_URL=/api  # 상대 경로 권장
```

---

## 헬스체크 및 모니터링

### 내장 헬스체크

#### Docker Compose 헬스체크

각 서비스는 Docker 헬스체크를 통해 자동으로 모니터링됩니다:

- **Database**: `pg_isready` 명령어 (10초 간격)
- **Backend**: `/health` 엔드포인트 (30초 간격)
- **Frontend**: HTTP 200 응답 확인 (30초 간격)

#### 헬스체크 상태 확인

```bash
# 전체 서비스 헬스 상태
docker-compose ps

# 특정 컨테이너 상세 헬스 정보
docker inspect parking-backend --format='{{json .State.Health}}' | jq
```

### 로그 모니터링

#### 실시간 로그 확인

```bash
# 전체 서비스 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f database

# 최근 100줄만 확인
docker-compose logs --tail=100
```

#### 로그 저장 설정

모든 컨테이너는 JSON 파일 로깅 드라이버를 사용합니다:

- **최대 파일 크기**: 10MB
- **최대 파일 개수**: 3개
- **총 로그 크기**: 최대 30MB

### 리소스 모니터링

#### CPU 및 메모리 사용량

```bash
# 실시간 리소스 사용량
docker stats

# 컨테이너별 리소스 제한
docker inspect parking-backend --format='{{json .HostConfig.Memory}}' | jq
```

#### 디스크 사용량

```bash
# Docker 시스템 전체 디스크 사용량
docker system df

# 상세 정보 (볼륨, 이미지별)
docker system df -v
```

---

## 백업 및 복구

### 데이터베이스 백업

#### 자동 백업 (스크립트 사용)

```bash
# 백업 실행
./deploy.sh backup

# 출력 예시:
# backups/parking_db_backup_20240205_143000.sql
```

#### 수동 백업

```bash
# PostgreSQL 덤프
docker-compose exec -T database pg_dump \
  -U parkingadmin parking_management \
  > backups/manual_backup_$(date +%Y%m%d_%H%M%S).sql

# 압축 백업
docker-compose exec -T database pg_dump \
  -U parkingadmin parking_management \
  | gzip > backups/backup_$(date +%Y%m%d).sql.gz
```

#### 정기 백업 (Cron)

```bash
# crontab 편집
crontab -e

# 매일 오전 3시 백업
0 3 * * * cd /path/to/parking-management && ./deploy.sh backup
```

### 데이터베이스 복구

#### 스크립트 사용

```bash
./deploy.sh restore

# 백업 파일 선택 화면에서 입력
```

#### 수동 복구

```bash
# PostgreSQL 복구
cat backups/parking_db_backup_20240205_143000.sql | \
  docker-compose exec -T database psql \
  -U parkingadmin parking_management

# 압축 파일 복구
gunzip -c backups/backup_20240205.sql.gz | \
  docker-compose exec -T database psql \
  -U parkingadmin parking_management
```

### 전체 시스템 백업

#### 볼륨 백업

```bash
# PostgreSQL 데이터 볼륨 백업
sudo tar -czf backups/postgres_volume_$(date +%Y%m%d).tar.gz \
  data/postgres/
```

#### 설정 파일 백업

```bash
# .env 및 설정 파일 백업
tar -czf backups/config_$(date +%Y%m%d).tar.gz \
  .env docker-compose.yml nginx/
```

---

## 트러블슈팅

### 일반적인 문제 및 해결 방법

#### 1. 컨테이너가 시작되지 않음

**증상:**
```bash
docker-compose ps
# STATUS: Exit 1
```

**해결 방법:**
```bash
# 로그 확인
docker-compose logs backend

# 컨테이너 재시작
docker-compose restart backend

# 전체 재시작
docker-compose down && docker-compose up -d
```

#### 2. 데이터베이스 연결 실패

**증상:**
```
Error: connect ECONNREFUSED database:5432
```

**해결 방법:**
```bash
# 데이터베이스 상태 확인
docker-compose exec database pg_isready -U parkingadmin

# 네트워크 연결 확인
docker network inspect parking-network

# 환경 변수 확인
docker-compose exec backend env | grep DATABASE
```

#### 3. 포트 충돌

**증상:**
```
Error: Bind for 0.0.0.0:80 failed: port is already allocated
```

**해결 방법:**
```bash
# 포트 사용 프로세스 확인
sudo lsof -i :80
sudo lsof -i :3000
sudo lsof -i :5432

# .env 파일에서 포트 변경
FRONTEND_PORT=8080
BACKEND_PORT=3001
POSTGRES_PORT=5433

# 서비스 재시작
docker-compose down && docker-compose up -d
```

#### 4. 디스크 공간 부족

**증상:**
```
Error: no space left on device
```

**해결 방법:**
```bash
# Docker 디스크 정리
docker system prune -a --volumes

# 사용하지 않는 이미지 삭제
docker image prune -a

# 오래된 로그 삭제
rm -f data/postgres/pg_log/*.log.old
```

#### 5. 메모리 부족

**증상:**
```
Out of memory: Killed process
```

**해결 방법:**
```bash
# 리소스 제한 확인
docker stats

# docker-compose.yml에서 메모리 제한 조정
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G  # 512M → 1G로 증가
```

#### 6. CORS 에러

**증상:**
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**해결 방법:**
```bash
# .env 파일에서 CORS 설정 수정
CORS_ORIGIN=https://yourdomain.com

# 여러 도메인 허용 (개발 환경)
CORS_ORIGIN=http://localhost:3000,http://localhost:80

# 서비스 재시작
docker-compose restart backend
```

### 디버깅 도구

#### 컨테이너 내부 접속

```bash
# Bash 쉘 접속
docker-compose exec backend sh
docker-compose exec database bash

# PostgreSQL 클라이언트 접속
docker-compose exec database psql -U parkingadmin -d parking_management
```

#### 네트워크 디버깅

```bash
# 컨테이너 간 핑 테스트
docker-compose exec backend ping database

# DNS 확인
docker-compose exec backend nslookup database

# 포트 연결 테스트
docker-compose exec backend nc -zv database 5432
```

#### 로그 필터링

```bash
# 에러 로그만 확인
docker-compose logs backend | grep -i error

# 특정 시간대 로그
docker-compose logs --since 1h backend

# 특정 패턴 검색
docker-compose logs backend | grep "API request"
```

---

## 프로덕션 배포 체크리스트

### 배포 전 (Pre-Deployment)

- [ ] **환경 변수 설정 완료**
  - [ ] `POSTGRES_PASSWORD` 변경 (최소 16자, 복잡도 높음)
  - [ ] `CORS_ORIGIN` 프로덕션 도메인 설정
  - [ ] `VITE_API_URL` 프로덕션 URL 설정
  - [ ] `NODE_ENV=production` 설정

- [ ] **시스템 요구사항 확인**
  - [ ] Docker 버전 20.10 이상
  - [ ] Docker Compose 버전 1.29 이상
  - [ ] 디스크 공간 최소 20GB 이상
  - [ ] 메모리 최소 4GB 이상

- [ ] **네트워크 설정**
  - [ ] 포트 80, 443 방화벽 허용
  - [ ] 도메인 DNS 레코드 설정
  - [ ] SSL/TLS 인증서 준비 (선택)

- [ ] **백업 계획 수립**
  - [ ] 정기 백업 스케줄 설정 (Cron)
  - [ ] 백업 저장소 준비 (S3, NFS 등)
  - [ ] 백업 복구 테스트 완료

### 배포 중 (Deployment)

- [ ] **빌드 및 배포**
  - [ ] `./deploy.sh init` 실행
  - [ ] `./deploy.sh build` 실행
  - [ ] `./deploy.sh up` 실행

- [ ] **헬스체크**
  - [ ] `./healthcheck.sh` 실행
  - [ ] 모든 서비스 정상 (healthy) 확인
  - [ ] API 엔드포인트 테스트

- [ ] **기능 테스트**
  - [ ] 프론트엔드 접속 확인
  - [ ] 주차권 구매 기능 테스트
  - [ ] 주차권 사용 기능 테스트
  - [ ] 잔액 조회 기능 테스트

### 배포 후 (Post-Deployment)

- [ ] **모니터링 설정**
  - [ ] 로그 모니터링 도구 연결
  - [ ] 리소스 사용량 모니터링
  - [ ] 에러 알림 설정

- [ ] **보안 강화**
  - [ ] 불필요한 포트 차단 (5432, 3000 프로덕션 차단)
  - [ ] HTTPS 적용 (Let's Encrypt 또는 유료 인증서)
  - [ ] 방화벽 규칙 설정
  - [ ] 정기 보안 업데이트 계획

- [ ] **문서화**
  - [ ] 배포 일시 및 버전 기록
  - [ ] 변경 사항 문서화
  - [ ] 운영 매뉴얼 작성

- [ ] **백업 검증**
  - [ ] 첫 백업 수동 실행
  - [ ] 백업 파일 검증
  - [ ] 복구 테스트 수행

### 보안 체크리스트

- [ ] **환경 변수 보안**
  - [ ] `.env` 파일 Git에 커밋하지 않음 (`.gitignore` 확인)
  - [ ] 프로덕션 패스워드 복잡도 검증
  - [ ] 시크릿 관리 도구 사용 (AWS Secrets Manager, Vault 등)

- [ ] **네트워크 보안**
  - [ ] 데이터베이스 포트 외부 차단
  - [ ] 백엔드 API 포트 외부 차단 (Nginx 프록시만 사용)
  - [ ] CORS 허용 도메인 제한

- [ ] **컨테이너 보안**
  - [ ] 읽기 전용 파일시스템 활성화 (프론트엔드)
  - [ ] `no-new-privileges` 설정 확인
  - [ ] 리소스 제한 설정 (메모리, CPU)

- [ ] **애플리케이션 보안**
  - [ ] SQL Injection 방지 확인
  - [ ] XSS 방지 헤더 설정
  - [ ] CSRF 토큰 사용 (향후)

---

## 고급 주제

### Blue-Green 배포

```bash
# 기존 서비스 (Blue)
docker-compose -p parking-blue up -d

# 새 버전 서비스 (Green)
docker-compose -p parking-green up -d -f docker-compose.green.yml

# 트래픽 전환 (로드 밸런서 설정)
# ...

# 구버전 서비스 종료
docker-compose -p parking-blue down
```

### 스케일링

```bash
# 백엔드 인스턴스 3개로 증가
docker-compose up -d --scale backend=3

# 로드 밸런서 (Nginx) 설정 필요
```

### SSL/TLS 설정 (HTTPS)

#### Let's Encrypt 인증서 발급

```bash
# Certbot 설치
sudo apt-get install certbot python3-certbot-nginx

# 인증서 발급
sudo certbot --nginx -d yourdomain.com

# 자동 갱신 설정
sudo certbot renew --dry-run
```

#### Docker Compose 수정

```yaml
frontend:
  ports:
    - "80:80"
    - "443:443"  # HTTPS 포트 추가
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro  # 인증서 마운트
```

### 모니터링 스택 추가 (Prometheus + Grafana)

```bash
# 모니터링 스택 실행
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Grafana 접속
http://localhost:3001
# 기본 계정: admin / admin
```

---

## 참고 자료

### 공식 문서

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)

### 프로젝트 문서

- [README.md](./README.md): 프로젝트 개요
- [ARCHITECTURE.md](./ARCHITECTURE.md): 아키텍처 설계
- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md): 데이터베이스 설계
- [API_SPECIFICATION.md](./API_SPECIFICATION.md): API 명세
- [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md): 개발 로그

### 배포 스크립트

- [deploy.sh](./deploy.sh): 턴키 배포 스크립트
- [healthcheck.sh](./healthcheck.sh): 헬스체크 스크립트

---

## 지원 및 문의

### 이슈 리포팅

- GitHub Issues: [프로젝트 저장소 URL]
- 이메일: devops@yourcompany.com

### 긴급 상황 대응

1. **서비스 장애 발생 시**:
   ```bash
   # 즉시 헬스체크 실행
   ./healthcheck.sh --verbose

   # 로그 확인
   docker-compose logs -f --tail=100

   # 필요 시 롤백
   docker-compose down
   docker-compose pull parking-backend:previous
   docker-compose up -d
   ```

2. **데이터 손실 우려 시**:
   ```bash
   # 즉시 백업 실행
   ./deploy.sh backup

   # 백업 파일 안전한 곳에 복사
   cp backups/*.sql /backup/remote/location/
   ```

---

**작성자:** DevOps 엔지니어
**최종 수정일:** 2024-02-05
**문서 버전:** 1.0.0

**© 2024 회사 주차 관리 서비스. All rights reserved.**
