#!/bin/bash

# ============================================
# 데이터베이스 백업 및 복구 스크립트
# ============================================
# Project: 회사 주차 관리 서비스
# Author: 백엔드 개발자 (시니어)
# Date: 2024-02-05
#
# 설명:
#   PostgreSQL 데이터베이스의 백업 및 복구를 자동화하는 스크립트
#   cron에 등록하여 정기적으로 백업 수행
#
# 사용법:
#   ./backup_restore.sh backup          # 전체 백업
#   ./backup_restore.sh backup-table    # 특정 테이블 백업
#   ./backup_restore.sh restore <파일>  # 백업 복구
#   ./backup_restore.sh list            # 백업 목록 조회
#   ./backup_restore.sh cleanup         # 오래된 백업 삭제
# ============================================

set -euo pipefail  # 에러 발생 시 즉시 종료

# ============================================
# 환경 변수 설정
# ============================================

# 데이터베이스 접속 정보
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-parking_management}"
DB_USER="${DB_USER:-parking_user}"
DB_PASSWORD="${DB_PASSWORD:-parking_password_secure_123}"

# 백업 디렉토리
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"  # 백업 보관 기간 (일)

# 로그 설정
LOG_DIR="${LOG_DIR:-./logs}"
LOG_FILE="${LOG_DIR}/backup_$(date +%Y%m%d).log"

# 색상 정의 (터미널 출력용)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# 유틸리티 함수
# ============================================

# 로그 함수
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # 파일에 로그 기록
    mkdir -p "$LOG_DIR"
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"

    # 터미널에 색상 출력
    case $level in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
    esac
}

# PostgreSQL 연결 테스트
test_connection() {
    log "INFO" "데이터베이스 연결 테스트 중..."

    PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        log "SUCCESS" "데이터베이스 연결 성공"
        return 0
    else
        log "ERROR" "데이터베이스 연결 실패"
        return 1
    fi
}

# ============================================
# 백업 함수
# ============================================

# 전체 데이터베이스 백업
backup_full() {
    log "INFO" "전체 데이터베이스 백업 시작..."

    # 백업 디렉토리 생성
    mkdir -p "$BACKUP_DIR"

    # 백업 파일명 생성 (날짜_시간 포맷)
    local backup_file="${BACKUP_DIR}/${DB_NAME}_full_$(date +%Y%m%d_%H%M%S).dump"

    # pg_dump 실행 (커스텀 포맷, 압축)
    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -F c \
        -f "$backup_file" \
        --verbose \
        2>> "$LOG_FILE"

    if [ $? -eq 0 ]; then
        local file_size=$(du -h "$backup_file" | cut -f1)
        log "SUCCESS" "백업 완료: $backup_file (크기: $file_size)"

        # 백업 파일 무결성 검증
        verify_backup "$backup_file"
    else
        log "ERROR" "백업 실패"
        return 1
    fi
}

# 특정 테이블만 백업
backup_table() {
    local table_name="${1:-transactions}"

    log "INFO" "테이블 백업 시작: $table_name"

    mkdir -p "$BACKUP_DIR"

    local backup_file="${BACKUP_DIR}/${DB_NAME}_${table_name}_$(date +%Y%m%d_%H%M%S).dump"

    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -F c \
        -t "$table_name" \
        -f "$backup_file" \
        --verbose \
        2>> "$LOG_FILE"

    if [ $? -eq 0 ]; then
        local file_size=$(du -h "$backup_file" | cut -f1)
        log "SUCCESS" "테이블 백업 완료: $backup_file (크기: $file_size)"
    else
        log "ERROR" "테이블 백업 실패"
        return 1
    fi
}

# 스키마만 백업 (데이터 제외)
backup_schema() {
    log "INFO" "스키마만 백업 시작..."

    mkdir -p "$BACKUP_DIR"

    local backup_file="${BACKUP_DIR}/${DB_NAME}_schema_$(date +%Y%m%d_%H%M%S).sql"

    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --schema-only \
        -f "$backup_file" \
        2>> "$LOG_FILE"

    if [ $? -eq 0 ]; then
        log "SUCCESS" "스키마 백업 완료: $backup_file"
    else
        log "ERROR" "스키마 백업 실패"
        return 1
    fi
}

# 백업 파일 무결성 검증
verify_backup() {
    local backup_file="$1"

    log "INFO" "백업 파일 무결성 검증 중..."

    # pg_restore로 목록 확인 (실제 복구는 하지 않음)
    PGPASSWORD=$DB_PASSWORD pg_restore \
        -l "$backup_file" \
        > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        log "SUCCESS" "백업 파일 검증 성공"
        return 0
    else
        log "ERROR" "백업 파일 손상됨"
        return 1
    fi
}

# ============================================
# 복구 함수
# ============================================

# 전체 데이터베이스 복구
restore_full() {
    local backup_file="$1"

    if [ ! -f "$backup_file" ]; then
        log "ERROR" "백업 파일을 찾을 수 없습니다: $backup_file"
        return 1
    fi

    log "WARNING" "데이터베이스 복구를 시작합니다. 기존 데이터가 삭제됩니다!"
    echo -n "계속하시겠습니까? (yes/no): "
    read -r confirmation

    if [ "$confirmation" != "yes" ]; then
        log "INFO" "복구가 취소되었습니다."
        return 0
    fi

    log "INFO" "복구 시작: $backup_file"

    # 기존 데이터베이스 삭제 및 재생성
    PGPASSWORD=$DB_PASSWORD psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres \
        -c "DROP DATABASE IF EXISTS $DB_NAME;" \
        2>> "$LOG_FILE"

    PGPASSWORD=$DB_PASSWORD psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres \
        -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" \
        2>> "$LOG_FILE"

    # pg_restore 실행
    PGPASSWORD=$DB_PASSWORD pg_restore \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --clean \
        --if-exists \
        --verbose \
        "$backup_file" \
        2>> "$LOG_FILE"

    if [ $? -eq 0 ]; then
        log "SUCCESS" "복구 완료"

        # 복구 후 통계 정보 업데이트
        PGPASSWORD=$DB_PASSWORD psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -c "ANALYZE;" \
            2>> "$LOG_FILE"

        log "SUCCESS" "통계 정보 업데이트 완료"
    else
        log "ERROR" "복구 실패"
        return 1
    fi
}

# 특정 테이블만 복구
restore_table() {
    local backup_file="$1"
    local table_name="${2:-transactions}"

    if [ ! -f "$backup_file" ]; then
        log "ERROR" "백업 파일을 찾을 수 없습니다: $backup_file"
        return 1
    fi

    log "INFO" "테이블 복구 시작: $table_name from $backup_file"

    PGPASSWORD=$DB_PASSWORD pg_restore \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t "$table_name" \
        --clean \
        --if-exists \
        --verbose \
        "$backup_file" \
        2>> "$LOG_FILE"

    if [ $? -eq 0 ]; then
        log "SUCCESS" "테이블 복구 완료"
    else
        log "ERROR" "테이블 복구 실패"
        return 1
    fi
}

# ============================================
# 유지보수 함수
# ============================================

# 백업 목록 조회
list_backups() {
    log "INFO" "백업 파일 목록:"

    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
        log "WARNING" "백업 파일이 없습니다."
        return 0
    fi

    echo ""
    echo "========================================"
    ls -lh "$BACKUP_DIR" | tail -n +2 | awk '{printf "%-50s %10s %s %s %s\n", $9, $5, $6, $7, $8}'
    echo "========================================"
    echo ""

    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    log "INFO" "총 백업 크기: $total_size"
}

# 오래된 백업 삭제
cleanup_old_backups() {
    log "INFO" "오래된 백업 삭제 시작 (보관 기간: ${BACKUP_RETENTION_DAYS}일)"

    if [ ! -d "$BACKUP_DIR" ]; then
        log "WARNING" "백업 디렉토리가 없습니다."
        return 0
    fi

    local deleted_count=0

    # $BACKUP_RETENTION_DAYS일 이전 파일 찾기 및 삭제
    while IFS= read -r file; do
        rm -f "$file"
        log "INFO" "삭제됨: $(basename $file)"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "*.dump" -mtime +$BACKUP_RETENTION_DAYS)

    if [ $deleted_count -eq 0 ]; then
        log "INFO" "삭제할 백업 파일이 없습니다."
    else
        log "SUCCESS" "총 ${deleted_count}개 백업 파일 삭제 완료"
    fi
}

# ============================================
# 메인 함수
# ============================================

show_usage() {
    cat << EOF
사용법: $0 <명령어> [옵션]

명령어:
  backup              전체 데이터베이스 백업
  backup-table [테이블명]  특정 테이블 백업 (기본값: transactions)
  backup-schema       스키마만 백업 (데이터 제외)
  restore <파일>      백업 파일로부터 복구
  restore-table <파일> [테이블명]  특정 테이블 복구
  list                백업 목록 조회
  cleanup             오래된 백업 삭제 (${BACKUP_RETENTION_DAYS}일 이전)
  test                데이터베이스 연결 테스트
  help                도움말 표시

예시:
  $0 backup
  $0 backup-table transactions
  $0 restore ./backups/parking_management_full_20240205_103000.dump
  $0 list
  $0 cleanup

환경 변수:
  DB_HOST             데이터베이스 호스트 (기본값: localhost)
  DB_PORT             데이터베이스 포트 (기본값: 5432)
  DB_NAME             데이터베이스 이름 (기본값: parking_management)
  DB_USER             데이터베이스 사용자 (기본값: parking_user)
  DB_PASSWORD         데이터베이스 암호
  BACKUP_DIR          백업 디렉토리 (기본값: ./backups)
  BACKUP_RETENTION_DAYS  백업 보관 기간 (기본값: 30일)
  LOG_DIR             로그 디렉토리 (기본값: ./logs)

EOF
}

main() {
    local command="${1:-}"

    # 로그 시작
    log "INFO" "=========================================="
    log "INFO" "백업/복구 스크립트 시작"
    log "INFO" "명령어: $command"
    log "INFO" "=========================================="

    case "$command" in
        backup)
            test_connection && backup_full
            ;;
        backup-table)
            test_connection && backup_table "${2:-transactions}"
            ;;
        backup-schema)
            test_connection && backup_schema
            ;;
        restore)
            if [ -z "${2:-}" ]; then
                log "ERROR" "백업 파일 경로를 지정해주세요."
                echo "사용법: $0 restore <백업파일>"
                exit 1
            fi
            test_connection && restore_full "$2"
            ;;
        restore-table)
            if [ -z "${2:-}" ]; then
                log "ERROR" "백업 파일 경로를 지정해주세요."
                echo "사용법: $0 restore-table <백업파일> [테이블명]"
                exit 1
            fi
            test_connection && restore_table "$2" "${3:-transactions}"
            ;;
        list)
            list_backups
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        test)
            test_connection
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            log "ERROR" "알 수 없는 명령어: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac

    local exit_code=$?

    log "INFO" "=========================================="
    if [ $exit_code -eq 0 ]; then
        log "SUCCESS" "작업 완료"
    else
        log "ERROR" "작업 실패 (종료 코드: $exit_code)"
    fi
    log "INFO" "=========================================="

    exit $exit_code
}

# 스크립트 실행
main "$@"
