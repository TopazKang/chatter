/**
 * Transaction 라우트
 *
 * 주차권 거래 관련 API 엔드포인트를 정의합니다.
 *
 * RESTful API 패턴:
 * - POST   /api/transactions           - 거래 생성
 * - GET    /api/transactions           - 전체 거래 조회
 * - GET    /api/transactions/balance   - 잔여 수량 조회
 * - GET    /api/transactions/user/:name - 사용자별 거래 조회
 *
 * 라우트 설계 원칙:
 * - 명사 중심의 리소스 URL (transactions)
 * - HTTP 메서드를 의미에 맞게 사용
 * - 계층적 URL 구조 (balance, user/:name)
 * - 미들웨어 체이닝을 통한 검증 및 처리
 */

const express = require('express');
const router = express.Router();

// 컨트롤러 가져오기
const transactionController = require('../controllers/transactionController');

// 검증 미들웨어 가져오기
const {
  validateCreateTransaction,
  validatePagination,
  validateUserName,
  validateSqlInjection
} = require('../middlewares/validator');

/**
 * 라우트 정의
 *
 * 각 라우트는 다음 패턴을 따릅니다:
 * router.METHOD(PATH, [MIDDLEWARE...], CONTROLLER)
 *
 * 미들웨어 체이닝:
 * 1. SQL Injection 검증
 * 2. 입력 데이터 검증
 * 3. 컨트롤러 실행
 */

// ============================================
// 1. 거래 생성 (주차권 구매 또는 사용)
// ============================================
/**
 * POST /api/transactions
 *
 * 요청 본문:
 * {
 *   "user_name": "홍길동",
 *   "type": "purchase" | "use",
 *   "quantity": 5
 * }
 *
 * 미들웨어:
 * - validateSqlInjection: SQL Injection 방어
 * - validateCreateTransaction: 입력 검증
 *
 * 응답:
 * 201 Created - 거래 생성 성공
 * 400 Bad Request - 입력 검증 실패
 * 500 Internal Server Error - 서버 오류
 */
router.post(
  '/',
  validateSqlInjection,
  validateCreateTransaction,
  transactionController.createTransaction
);

// ============================================
// 2. 현재 잔여 주차권 수량 조회
// ============================================
/**
 * GET /api/transactions/balance
 *
 * 쿼리 파라미터: 없음
 *
 * 응답:
 * {
 *   "success": true,
 *   "data": {
 *     "totalPurchased": 100,
 *     "totalUsed": 35,
 *     "balance": 65
 *   }
 * }
 *
 * 주의: 이 라우트는 /api/transactions/:id 보다 먼저 정의되어야 합니다.
 * (그렇지 않으면 'balance'가 :id로 인식됨)
 */
router.get(
  '/balance',
  transactionController.getBalance
);

// ============================================
// 2-1. 데이터베이스 통계 조회 (관리자용)
// ============================================
/**
 * GET /api/transactions/stats
 *
 * 쿼리 파라미터: 없음
 *
 * 응답:
 * {
 *   "success": true,
 *   "data": {
 *     "totalTransactions": 1250,
 *     "totalUsers": 45,
 *     "totalPurchased": 5000,
 *     "totalUsed": 3200,
 *     "currentBalance": 1800,
 *     "avgPurchasePerUser": 111.11,
 *     "avgUsePerUser": 71.11
 *   }
 * }
 *
 * 당위성:
 * - 관리자 대시보드나 모니터링 시스템에서 활용
 * - get_database_stats() 스토어드 함수를 사용하여 효율적으로 조회
 */
router.get(
  '/stats',
  transactionController.getStats
);

// ============================================
// 3. 특정 사용자의 거래 내역 조회
// ============================================
/**
 * GET /api/transactions/user/:name
 *
 * URL 파라미터:
 * - name: 사용자 이름 (예: 홍길동)
 *
 * 쿼리 파라미터:
 * - limit: 조회 개수 (기본값: 100, 최대: 1000)
 * - offset: 시작 위치 (기본값: 0)
 *
 * 미들웨어:
 * - validateSqlInjection: SQL Injection 방어
 * - validateUserName: 사용자 이름 검증
 * - validatePagination: 페이지네이션 파라미터 검증
 *
 * 응답:
 * 200 OK - 조회 성공
 * 400 Bad Request - 잘못된 파라미터
 * 404 Not Found - 사용자 없음
 */
router.get(
  '/user/:name',
  validateSqlInjection,
  validateUserName,
  validatePagination,
  transactionController.getUserTransactions
);

// ============================================
// 4. 전체 거래 내역 조회
// ============================================
/**
 * GET /api/transactions
 *
 * 쿼리 파라미터:
 * - limit: 조회 개수 (기본값: 100, 최대: 1000)
 * - offset: 시작 위치 (기본값: 0)
 * - orderBy: 정렬 필드 (기본값: created_at)
 * - orderDir: 정렬 방향 (ASC | DESC, 기본값: DESC)
 *
 * 미들웨어:
 * - validateSqlInjection: SQL Injection 방어
 * - validatePagination: 페이지네이션 파라미터 검증
 *
 * 응답:
 * {
 *   "success": true,
 *   "data": {
 *     "transactions": [...],
 *     "pagination": {
 *       "limit": 100,
 *       "offset": 0,
 *       "total": 250,
 *       "hasMore": true
 *     }
 *   }
 * }
 *
 * 주의: 이 라우트는 가장 마지막에 정의되어야 합니다.
 * (다른 특수 경로들이 먼저 매칭되도록)
 */
router.get(
  '/',
  validateSqlInjection,
  validatePagination,
  transactionController.getAllTransactions
);

/**
 * 라우트 순서 설명
 *
 * Express는 라우트를 정의된 순서대로 매칭합니다.
 * 따라서 아래 순서를 지켜야 합니다:
 *
 * 1. POST / (명확한 메서드)
 * 2. GET /balance (특수 경로)
 * 3. GET /user/:name (특수 경로)
 * 4. GET / (일반 경로) - 마지막
 *
 * 잘못된 순서 예:
 * GET /:id (먼저 정의)
 * GET /balance (나중 정의) → 'balance'가 :id로 인식됨!
 */

module.exports = router;
