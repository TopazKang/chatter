#!/bin/bash

# ============================================
# 회사 주차 관리 서비스 - 턴키 배포 스크립트
# ============================================
# Docker Compose 기반 원클릭 배포 자동화
#
# 목적:
# - 전체 스택(DB + 백엔드 + 프론트엔드)을 한 번에 배포
# - 환경 변수 검증 및 자동 설정
# - 헬스체크 및 배포 성공 여부 확인
# - 롤백 기능 제공
#
# 사용법:
# ./deploy.sh [command] [options]
#
# 명령어:
# - init       : 초기 설정 (환경 변수, 디렉토리 생성)
# - build      : Docker 이미지 빌드
# - up         : 서비스 시작
# - down       : 서비스 중지
# - restart    : 서비스 재시작
# - logs       : 로그 확인
# - status     : 서비스 상태 확인
# - clean      : 모든 데이터 삭제 (주의!)
# - backup     : 데이터베이스 백업
# - restore    : 데이터베이스 복구
# - help       : 도움말

set -e  # 에러 발생 시 스크립트 중단

# ============================================
# 색상 정의 (터미널 출력)
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================
# 유틸리티 함수
# ============================================
log_info() {
  echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
  echo -e "\n${BLUE}==>${NC} $1\n"
}

# ============================================
# 환경 검증
# ============================================
check_requirements() {
  log_step "시스템 요구사항 확인 중..."

  # Docker 설치 확인
  if ! command -v docker &> /dev/null; then
    log_error "Docker가 설치되어 있지 않습니다. https://docs.docker.com/get-docker/"
    exit 1
  fi
  log_success "Docker 설치 확인: $(docker --version)"

  # Docker Compose 설치 확인
  if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose가 설치되어 있지 않습니다."
    exit 1
  fi
  log_success "Docker Compose 설치 확인: $(docker-compose --version)"

  # Docker 데몬 실행 확인
  if ! docker info &> /dev/null; then
    log_error "Docker 데몬이 실행되고 있지 않습니다. Docker를 시작해주세요."
    exit 1
  fi
  log_success "Docker 데몬 실행 중"

  # 디스크 공간 확인 (최소 5GB)
  available_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
  if [ "$available_space" -lt 5 ]; then
    log_warning "디스크 공간이 부족합니다. 최소 5GB 이상 권장 (현재: ${available_space}GB)"
  else
    log_success "디스크 공간 충분: ${available_space}GB"
  fi
}

# ============================================
# 초기 설정
# ============================================
init_project() {
  log_step "프로젝트 초기 설정 중..."

  # .env 파일 생성
  if [ ! -f .env ]; then
    log_info ".env 파일이 없습니다. .env.example에서 복사합니다..."
    cp .env.example .env
    log_success ".env 파일 생성 완료"
    log_warning "⚠️  .env 파일을 열어 환경 변수를 확인하고 수정하세요!"
    log_warning "특히 프로덕션 환경에서는 패스워드를 반드시 변경하세요."
  else
    log_info ".env 파일이 이미 존재합니다."
  fi

  # 필수 디렉토리 생성
  log_info "필수 디렉토리 생성 중..."
  mkdir -p data/postgres
  mkdir -p backups
  mkdir -p logs

  # 권한 설정 (PostgreSQL 볼륨)
  chmod 755 data/postgres

  log_success "초기 설정 완료"
}

# ============================================
# Docker 이미지 빌드
# ============================================
build_images() {
  log_step "Docker 이미지 빌드 중..."

  docker-compose build --no-cache --parallel

  log_success "이미지 빌드 완료"
}

# ============================================
# 서비스 시작
# ============================================
start_services() {
  log_step "서비스 시작 중..."

  # 환경 변수 로드
  if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
  fi

  # Docker Compose 실행
  docker-compose up -d

  log_success "서비스가 백그라운드에서 시작되었습니다."

  # 헬스체크 대기
  log_step "서비스 헬스체크 중... (최대 60초)"
  sleep 5  # 컨테이너 시작 대기

  # PostgreSQL 헬스체크
  log_info "데이터베이스 헬스체크 중..."
  timeout=60
  elapsed=0
  while [ $elapsed -lt $timeout ]; do
    if docker-compose exec -T database pg_isready -U ${POSTGRES_USER:-parkingadmin} &> /dev/null; then
      log_success "✓ 데이터베이스 준비 완료"
      break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    echo -n "."
  done
  echo ""

  if [ $elapsed -ge $timeout ]; then
    log_error "데이터베이스 헬스체크 실패"
    exit 1
  fi

  # 백엔드 헬스체크
  log_info "백엔드 API 헬스체크 중..."
  elapsed=0
  while [ $elapsed -lt $timeout ]; do
    if curl -f http://localhost:${BACKEND_PORT:-3000}/health &> /dev/null; then
      log_success "✓ 백엔드 API 준비 완료"
      break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    echo -n "."
  done
  echo ""

  if [ $elapsed -ge $timeout ]; then
    log_error "백엔드 헬스체크 실패"
    exit 1
  fi

  # 프론트엔드 헬스체크
  log_info "프론트엔드 웹 서버 헬스체크 중..."
  elapsed=0
  while [ $elapsed -lt $timeout ]; do
    if curl -f http://localhost:${FRONTEND_PORT:-80}/ &> /dev/null; then
      log_success "✓ 프론트엔드 웹 서버 준비 완료"
      break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    echo -n "."
  done
  echo ""

  if [ $elapsed -ge $timeout ]; then
    log_error "프론트엔드 헬스체크 실패"
    exit 1
  fi

  log_success "🎉 모든 서비스가 정상적으로 시작되었습니다!"
  echo ""
  echo "======================================"
  echo "서비스 접속 정보"
  echo "======================================"
  echo "프론트엔드: http://localhost:${FRONTEND_PORT:-80}"
  echo "백엔드 API: http://localhost:${BACKEND_PORT:-3000}/api"
  echo "데이터베이스: localhost:${POSTGRES_PORT:-5432}"
  echo "======================================"
}

# ============================================
# 서비스 중지
# ============================================
stop_services() {
  log_step "서비스 중지 중..."

  docker-compose down

  log_success "서비스가 중지되었습니다."
}

# ============================================
# 서비스 재시작
# ============================================
restart_services() {
  log_step "서비스 재시작 중..."

  stop_services
  start_services
}

# ============================================
# 로그 확인
# ============================================
view_logs() {
  log_step "서비스 로그 확인 (Ctrl+C로 종료)"

  docker-compose logs -f --tail=100
}

# ============================================
# 서비스 상태 확인
# ============================================
check_status() {
  log_step "서비스 상태 확인"

  docker-compose ps

  echo ""
  log_info "상세 헬스 상태:"
  docker-compose ps | awk 'NR>1 {print $1}' | xargs -I {} docker inspect {} --format='{{.Name}}: {{.State.Health.Status}}' 2>/dev/null || echo "헬스체크 정보 없음"
}

# ============================================
# 데이터 삭제 (초기화)
# ============================================
clean_all() {
  log_warning "⚠️  이 명령은 모든 데이터를 삭제합니다!"
  read -p "정말로 모든 데이터를 삭제하시겠습니까? (yes/no): " confirm

  if [ "$confirm" != "yes" ]; then
    log_info "취소되었습니다."
    exit 0
  fi

  log_step "모든 데이터 삭제 중..."

  # 컨테이너 및 볼륨 삭제
  docker-compose down -v

  # 데이터 디렉토리 삭제
  rm -rf data/postgres/*
  rm -rf logs/*

  log_success "모든 데이터가 삭제되었습니다."
}

# ============================================
# 데이터베이스 백업
# ============================================
backup_database() {
  log_step "데이터베이스 백업 중..."

  # 환경 변수 로드
  if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
  fi

  # 백업 파일명 생성
  backup_file="backups/parking_db_backup_$(date +%Y%m%d_%H%M%S).sql"

  # pg_dump 실행
  docker-compose exec -T database pg_dump -U ${POSTGRES_USER:-parkingadmin} ${POSTGRES_DB:-parking_management} > "$backup_file"

  log_success "백업 완료: $backup_file"
}

# ============================================
# 데이터베이스 복구
# ============================================
restore_database() {
  log_step "데이터베이스 복구"

  # 백업 파일 목록 표시
  echo "사용 가능한 백업 파일:"
  ls -lh backups/*.sql 2>/dev/null || echo "백업 파일이 없습니다."

  read -p "복구할 백업 파일 경로를 입력하세요: " backup_file

  if [ ! -f "$backup_file" ]; then
    log_error "파일을 찾을 수 없습니다: $backup_file"
    exit 1
  fi

  log_warning "⚠️  기존 데이터가 삭제됩니다!"
  read -p "계속하시겠습니까? (yes/no): " confirm

  if [ "$confirm" != "yes" ]; then
    log_info "취소되었습니다."
    exit 0
  fi

  # 환경 변수 로드
  if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
  fi

  # 데이터베이스 복구
  cat "$backup_file" | docker-compose exec -T database psql -U ${POSTGRES_USER:-parkingadmin} ${POSTGRES_DB:-parking_management}

  log_success "데이터베이스 복구 완료"
}

# ============================================
# 도움말
# ============================================
show_help() {
  cat << EOF
${CYAN}회사 주차 관리 서비스 - 배포 스크립트${NC}

${YELLOW}사용법:${NC}
  ./deploy.sh [command]

${YELLOW}명령어:${NC}
  ${GREEN}init${NC}       - 초기 설정 (환경 변수, 디렉토리 생성)
  ${GREEN}build${NC}      - Docker 이미지 빌드
  ${GREEN}up${NC}         - 서비스 시작
  ${GREEN}down${NC}       - 서비스 중지
  ${GREEN}restart${NC}    - 서비스 재시작
  ${GREEN}logs${NC}       - 로그 확인
  ${GREEN}status${NC}     - 서비스 상태 확인
  ${GREEN}clean${NC}      - 모든 데이터 삭제 (주의!)
  ${GREEN}backup${NC}     - 데이터베이스 백업
  ${GREEN}restore${NC}    - 데이터베이스 복구
  ${GREEN}help${NC}       - 이 도움말 표시

${YELLOW}예시:${NC}
  # 전체 배포 (처음 설치)
  ./deploy.sh init
  ./deploy.sh build
  ./deploy.sh up

  # 빠른 배포 (이미지 빌드 없이)
  ./deploy.sh up

  # 서비스 상태 확인
  ./deploy.sh status

  # 로그 확인
  ./deploy.sh logs

  # 백업
  ./deploy.sh backup

${YELLOW}주의사항:${NC}
  - 프로덕션 환경에서는 .env 파일의 패스워드를 반드시 변경하세요
  - clean 명령은 모든 데이터를 삭제합니다
  - 백업은 정기적으로 수행하세요

EOF
}

# ============================================
# 메인 로직
# ============================================
main() {
  # 배너 출력
  echo ""
  echo "${CYAN}========================================${NC}"
  echo "${CYAN}  회사 주차 관리 서비스 - 배포 스크립트${NC}"
  echo "${CYAN}========================================${NC}"
  echo ""

  # 명령어 파싱
  case "${1:-help}" in
    init)
      check_requirements
      init_project
      ;;
    build)
      check_requirements
      build_images
      ;;
    up)
      check_requirements
      start_services
      ;;
    down)
      stop_services
      ;;
    restart)
      restart_services
      ;;
    logs)
      view_logs
      ;;
    status)
      check_status
      ;;
    clean)
      clean_all
      ;;
    backup)
      backup_database
      ;;
    restore)
      restore_database
      ;;
    help|--help|-h)
      show_help
      ;;
    *)
      log_error "알 수 없는 명령어: $1"
      show_help
      exit 1
      ;;
  esac
}

# 스크립트 실행
main "$@"
