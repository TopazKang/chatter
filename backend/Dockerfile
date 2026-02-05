# ============================================
# 회사 주차 관리 서비스 - 백엔드 Dockerfile
# ============================================
# Node.js 백엔드 애플리케이션을 위한 멀티 스테이지 빌드
#
# 목적:
# - 경량화된 프로덕션 이미지 생성
# - 보안 강화 (불필요한 파일 제외)
# - 빠른 빌드 및 배포

# ============================================
# Stage 1: 베이스 이미지
# ============================================
FROM node:18-alpine AS base

# 작업 디렉토리 설정
WORKDIR /app

# 메타데이터 설정
LABEL maintainer="Backend Team"
LABEL description="회사 주차 관리 서비스 백엔드 API"
LABEL version="1.0.0"

# ============================================
# Stage 2: 의존성 설치
# ============================================
FROM base AS dependencies

# package.json과 package-lock.json 복사
COPY package*.json ./

# 프로덕션 의존성만 설치
# - npm ci: package-lock.json 기반 정확한 버전 설치
# - --only=production: devDependencies 제외
RUN npm ci --only=production && \
    npm cache clean --force

# ============================================
# Stage 3: 프로덕션 이미지
# ============================================
FROM base AS production

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=3000

# node 사용자로 실행 (보안 강화)
# Alpine 이미지에는 node 사용자가 기본 포함됨
USER node

# 작업 디렉토리 재설정
WORKDIR /app

# 의존성 복사 (Stage 2에서)
COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules

# 애플리케이션 코드 복사
COPY --chown=node:node package*.json ./
COPY --chown=node:node src ./src

# 포트 노출
EXPOSE 3000

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 애플리케이션 시작
CMD ["node", "src/app.js"]
