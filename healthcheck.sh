#!/bin/bash

# ============================================
# 회사 주차 관리 서비스 - 헬스체크 스크립트
# ============================================
# 전체 서비스의 상태를 확인하고 문제를 진단
#
# 목적:
# - 각 서비스(DB, 백엔드, 프론트엔드)의 헬스 상태 확인
# - 네트워크 연결성 테스트
# - API 엔드포인트 응답 검증
# - 문제 발생 시 자동 진단 및 해결 방법 제시
#
# 사용법:
# ./healthcheck.sh [options]
#
# 옵션:
# --verbose : 상세 출력
# --json    : JSON 형식 출력
# --fix     : 문제 자동 해결 시도

set -e

# ============================================
# 색상 정의
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================
# 전역 변수
# ============================================
VERBOSE=false
JSON_OUTPUT=false
AUTO_FIX=false
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# ============================================
# 유틸리티 함수
# ============================================
log_info() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${CYAN}[INFO]${NC} $1"
  fi
}

log_success() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${GREEN}[✓]${NC} $1"
  fi
  PASSED_CHECKS=$((PASSED_CHECKS + 1))
}

log_warning() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${YELLOW}[⚠]${NC} $1"
  fi
  WARNING_CHECKS=$((WARNING_CHECKS + 1))
}

log_error() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${RED}[✗]${NC} $1"
  fi
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
}

log_step() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "\n${BLUE}==>${NC} $1\n"
  fi
}

# ============================================
# 환경 변수 로드
# ============================================
load_env() {
  if [ -f .env ]; then
    export $(cat .env | grep -v '#' | grep -v '^$' | xargs)
  fi

  # 기본값 설정
  POSTGRES_USER=${POSTGRES_USER:-parkingadmin}
  POSTGRES_DB=${POSTGRES_DB:-parking_management}
  BACKEND_PORT=${BACKEND_PORT:-3000}
  FRONTEND_PORT=${FRONTEND_PORT:-80}
}

# ============================================
# Docker 상태 확인
# ============================================
check_docker() {
  log_step "Docker 환경 확인"
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  if ! command -v docker &> /dev/null; then
    log_error "Docker가 설치되어 있지 않습니다"
    return 1
  fi

  if ! docker info &> /dev/null; then
    log_error "Docker 데몬이 실행되고 있지 않습니다"
    if [ "$AUTO_FIX" = true ]; then
      log_info "Docker 데몬 시작 시도 중..."
      sudo systemctl start docker || true
    fi
    return 1
  fi

  log_success "Docker 데몬 실행 중"

  if [ "$VERBOSE" = true ]; then
    docker --version
  fi
}

# ============================================
# 컨테이너 상태 확인
# ============================================
check_containers() {
  log_step "컨테이너 상태 확인"

  containers=("parking-database" "parking-backend" "parking-frontend")

  for container in "${containers[@]}"; do
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
      log_error "${container} 컨테이너가 실행되고 있지 않습니다"

      if [ "$AUTO_FIX" = true ]; then
        log_info "${container} 컨테이너 재시작 시도 중..."
        docker-compose restart $(echo ${container} | sed 's/parking-//') || true
      fi
      continue
    fi

    # 컨테이너 상태 확인
    status=$(docker inspect -f '{{.State.Status}}' ${container})
    if [ "$status" != "running" ]; then
      log_error "${container} 상태: ${status}"
      continue
    fi

    # 헬스체크 상태 확인
    health=$(docker inspect -f '{{.State.Health.Status}}' ${container} 2>/dev/null || echo "none")

    if [ "$health" = "healthy" ]; then
      log_success "${container} 정상 실행 중 (healthy)"
    elif [ "$health" = "none" ]; then
      log_success "${container} 실행 중 (헬스체크 없음)"
    else
      log_warning "${container} 헬스체크 상태: ${health}"
    fi

    if [ "$VERBOSE" = true ]; then
      echo "  - 업타임: $(docker inspect -f '{{.State.StartedAt}}' ${container})"
      echo "  - CPU: $(docker stats ${container} --no-stream --format '{{.CPUPerc}}')"
      echo "  - 메모리: $(docker stats ${container} --no-stream --format '{{.MemUsage}}')"
    fi
  done
}

# ============================================
# 데이터베이스 헬스체크
# ============================================
check_database() {
  log_step "데이터베이스 연결 확인"
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  # PostgreSQL 연결 테스트
  if docker-compose exec -T database pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB} &> /dev/null; then
    log_success "PostgreSQL 연결 정상"
  else
    log_error "PostgreSQL 연결 실패"
    return 1
  fi

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  # 테이블 존재 확인
  table_count=$(docker-compose exec -T database psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | xargs)

  if [ -z "$table_count" ] || [ "$table_count" -eq 0 ]; then
    log_error "데이터베이스 테이블이 없습니다. 마이그레이션이 필요합니다."
    return 1
  else
    log_success "데이터베이스 테이블 확인: ${table_count}개"
  fi

  if [ "$VERBOSE" = true ]; then
    echo "  - 활성 연결 수: $(docker-compose exec -T database psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs)"
    echo "  - 데이터베이스 크기: $(docker-compose exec -T database psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -t -c "SELECT pg_size_pretty(pg_database_size('${POSTGRES_DB}'));" 2>/dev/null | xargs)"
  fi
}

# ============================================
# 백엔드 API 헬스체크
# ============================================
check_backend() {
  log_step "백엔드 API 확인"
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  # 헬스체크 엔드포인트 확인
  if curl -f -s http://localhost:${BACKEND_PORT}/health &> /dev/null; then
    log_success "백엔드 헬스체크 엔드포인트 응답 정상"
  else
    log_error "백엔드 헬스체크 엔드포인트 응답 없음"
    return 1
  fi

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  # API 엔드포인트 테스트
  api_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${BACKEND_PORT}/api/balance)

  if [ "$api_response" = "200" ]; then
    log_success "백엔드 API 엔드포인트 응답 정상 (HTTP 200)"
  else
    log_warning "백엔드 API 응답 코드: HTTP ${api_response}"
  fi

  if [ "$VERBOSE" = true ]; then
    echo "  - API 응답 시간: $(curl -s -o /dev/null -w "%{time_total}s" http://localhost:${BACKEND_PORT}/health)"
  fi
}

# ============================================
# 프론트엔드 웹 서버 헬스체크
# ============================================
check_frontend() {
  log_step "프론트엔드 웹 서버 확인"
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  # HTTP 응답 확인
  frontend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${FRONTEND_PORT}/)

  if [ "$frontend_response" = "200" ]; then
    log_success "프론트엔드 웹 서버 응답 정상 (HTTP 200)"
  else
    log_error "프론트엔드 웹 서버 응답 코드: HTTP ${frontend_response}"
    return 1
  fi

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  # Nginx 프록시 테스트 (프론트엔드 -> 백엔드)
  proxy_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${FRONTEND_PORT}/api/balance)

  if [ "$proxy_response" = "200" ]; then
    log_success "Nginx 리버스 프록시 정상 동작 (HTTP 200)"
  else
    log_warning "Nginx 프록시 응답 코드: HTTP ${proxy_response}"
  fi

  if [ "$VERBOSE" = true ]; then
    echo "  - 응답 시간: $(curl -s -o /dev/null -w "%{time_total}s" http://localhost:${FRONTEND_PORT}/)"
  fi
}

# ============================================
# 네트워크 연결성 확인
# ============================================
check_network() {
  log_step "네트워크 연결성 확인"
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  # Docker 네트워크 존재 확인
  if docker network inspect parking-network &> /dev/null; then
    log_success "Docker 네트워크 'parking-network' 존재"
  else
    log_error "Docker 네트워크가 없습니다"
    return 1
  fi

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  # 컨테이너 간 통신 테스트 (백엔드 -> 데이터베이스)
  if docker-compose exec -T backend sh -c "nc -z database 5432" &> /dev/null; then
    log_success "백엔드 → 데이터베이스 연결 정상"
  else
    log_error "백엔드에서 데이터베이스로 연결 불가"
  fi
}

# ============================================
# 디스크 공간 확인
# ============================================
check_disk_space() {
  log_step "디스크 공간 확인"
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  available_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')

  if [ "$available_space" -lt 1 ]; then
    log_error "디스크 공간 부족: ${available_space}GB (최소 1GB 필요)"
  elif [ "$available_space" -lt 5 ]; then
    log_warning "디스크 공간 부족: ${available_space}GB (5GB 이상 권장)"
  else
    log_success "디스크 공간 충분: ${available_space}GB"
  fi

  if [ "$VERBOSE" = true ]; then
    echo "  - Docker 이미지 크기: $(docker images --format '{{.Size}}' | awk '{sum+=$1} END {print sum}')MB"
    echo "  - Docker 볼륨 크기: $(docker system df -v | grep 'Local Volumes' | awk '{print $4}')"
  fi
}

# ============================================
# 로그 에러 확인
# ============================================
check_logs() {
  log_step "최근 로그 에러 확인"

  containers=("parking-database" "parking-backend" "parking-frontend")

  for container in "${containers[@]}"; do
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    error_count=$(docker logs ${container} --since 10m 2>&1 | grep -i error | wc -l)

    if [ "$error_count" -eq 0 ]; then
      log_success "${container}: 최근 10분간 에러 없음"
    else
      log_warning "${container}: 최근 10분간 에러 ${error_count}건 발견"

      if [ "$VERBOSE" = true ]; then
        echo "  최근 에러 로그:"
        docker logs ${container} --since 10m 2>&1 | grep -i error | head -5 | sed 's/^/    /'
      fi
    fi
  done
}

# ============================================
# 종합 리포트 출력
# ============================================
print_summary() {
  if [ "$JSON_OUTPUT" = true ]; then
    cat << EOF
{
  "timestamp": "$(date -Iseconds)",
  "total_checks": ${TOTAL_CHECKS},
  "passed": ${PASSED_CHECKS},
  "warnings": ${WARNING_CHECKS},
  "failed": ${FAILED_CHECKS},
  "health_score": $(echo "scale=2; ${PASSED_CHECKS}/${TOTAL_CHECKS}*100" | bc)
}
EOF
  else
    echo ""
    echo "======================================"
    echo "       헬스체크 종합 결과"
    echo "======================================"
    echo -e "총 검사 항목: ${TOTAL_CHECKS}"
    echo -e "${GREEN}정상:${NC} ${PASSED_CHECKS}"
    echo -e "${YELLOW}경고:${NC} ${WARNING_CHECKS}"
    echo -e "${RED}실패:${NC} ${FAILED_CHECKS}"

    health_score=$(echo "scale=2; ${PASSED_CHECKS}/${TOTAL_CHECKS}*100" | bc)
    echo -e "헬스 점수: ${health_score}%"
    echo "======================================"

    if [ "${FAILED_CHECKS}" -gt 0 ]; then
      echo -e "${RED}⚠️  일부 서비스에 문제가 있습니다.${NC}"
      echo "상세 로그 확인: docker-compose logs -f"
      exit 1
    elif [ "${WARNING_CHECKS}" -gt 0 ]; then
      echo -e "${YELLOW}⚠️  일부 경고가 있습니다.${NC}"
      exit 0
    else
      echo -e "${GREEN}✅ 모든 서비스가 정상입니다!${NC}"
      exit 0
    fi
  fi
}

# ============================================
# 메인 로직
# ============================================
main() {
  # 옵션 파싱
  while [[ $# -gt 0 ]]; do
    case $1 in
      --verbose)
        VERBOSE=true
        shift
        ;;
      --json)
        JSON_OUTPUT=true
        shift
        ;;
      --fix)
        AUTO_FIX=true
        shift
        ;;
      *)
        echo "알 수 없는 옵션: $1"
        echo "사용법: $0 [--verbose] [--json] [--fix]"
        exit 1
        ;;
    esac
  done

  if [ "$JSON_OUTPUT" = false ]; then
    echo ""
    echo "${CYAN}========================================${NC}"
    echo "${CYAN}  회사 주차 관리 서비스 - 헬스체크${NC}"
    echo "${CYAN}========================================${NC}"
    echo ""
  fi

  # 환경 변수 로드
  load_env

  # 순차적 헬스체크 실행
  check_docker
  check_containers
  check_database
  check_backend
  check_frontend
  check_network
  check_disk_space
  check_logs

  # 종합 리포트
  print_summary
}

# 스크립트 실행
main "$@"
