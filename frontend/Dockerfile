# Stage 1: Build 단계
FROM node:18-alpine AS build

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 복사 및 설치
COPY package*.json ./
RUN npm ci

# 소스 코드 복사
COPY . .

# 빌드 인자 설정 (환경 변수)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# 프로덕션 빌드
RUN npm run build

# Stage 2: Nginx로 정적 파일 서빙
FROM nginx:alpine AS production

# 빌드된 파일을 Nginx의 기본 디렉토리로 복사
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx 포트 노출
EXPOSE 80

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]
