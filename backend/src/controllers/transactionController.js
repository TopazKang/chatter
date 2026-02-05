/**
 * Transaction 컨트롤러
 *
 * API 엔드포인트의 HTTP 요청/응답을 처리합니다.
 *
 * 책임:
 * - HTTP 요청 파라미터 검증 및 추출
 * - 서비스 레이어 메서드 호출
 * - HTTP 응답 포맷팅
 * - HTTP 상태 코드 설정
 *
 * 패턴: Controller Layer (MVC 패턴의 일부)
 *
 * 설계 원칙:
 * - 컨트롤러는 HTTP 처리만 담당, 비즈니스 로직은 서비스 레이어에 위임
 * - 얇은 컨트롤러 (Thin Controller) 패턴
 */

const transactionService = require('../services/transactionService');
const { sequelize } = require('../config/database');

/**
 * 거래 생성 (주차권 구매 또는 사용)
 *
 * POST /api/transactions
 *
 * 요청 본문:
 * {
 *   "user_name": "홍길동",
 *   "type": "purchase" | "use",
 *   "quantity": 5
 * }
 *
 * 응답:
 * {
 *   "success": true,
 *   "data": {
 *     "transactionId": 1,
 *     "message": "주차권 5개 구매 완료",
 *     "currentBalance": 15
 *   }
 * }
 *
 * 에러 케이스:
 * - 필수 필드 누락
 * - 잘못된 type 값
 * - 음수 또는 0 수량
 * - 잔액 부족 (사용 시)
 *
 * 당위성:
 * - 스토어드 프로시저를 활용하여 동시성 제어 및 데이터 무결성 보장
 * - 특히 'use' 타입의 경우 Race Condition 방지
 */
exports.createTransaction = async (req, res, next) => {
  try {
    const { user_name, type, quantity } = req.body;

    // 입력 검증 (미들웨어에서 1차 검증, 여기서 추가 검증)
    if (!user_name || !type || !quantity) {
      return res.status(400).json({
        success: false,
        error: '필수 항목이 누락되었습니다. (user_name, type, quantity)',
        errorCode: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 타입 검증
    if (!['purchase', 'use'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: '거래 유형은 "purchase" 또는 "use"만 가능합니다.',
        errorCode: 'INVALID_TYPE'
      });
    }

    // 수량 검증
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        error: '수량은 1 이상의 정수여야 합니다.',
        errorCode: 'INVALID_QUANTITY'
      });
    }

    if (qty > 10000) {
      return res.status(400).json({
        success: false,
        error: '수량은 10000 이하여야 합니다.',
        errorCode: 'QUANTITY_TOO_LARGE'
      });
    }

    // 사용자 이름 검증 (길이 체크)
    const userName = user_name.trim();
    if (userName.length === 0 || userName.length > 100) {
      return res.status(400).json({
        success: false,
        error: '사용자 이름은 1자 이상 100자 이하여야 합니다.',
        errorCode: 'INVALID_USER_NAME'
      });
    }

    // 서비스 레이어 호출 (타입에 따라 다른 메서드 호출)
    let result;
    if (type === 'purchase') {
      result = await transactionService.purchaseParkingTicket(userName, qty);
    } else {
      result = await transactionService.useParkingTicket(userName, qty);
    }

    // 성공 응답
    res.status(201).json({
      success: true,
      data: {
        transactionId: result.transactionId,
        message: result.message,
        currentBalance: result.currentBalance
      }
    });

  } catch (error) {
    // 잔액 부족 에러 처리
    if (error.code === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({
        success: false,
        error: error.message,
        errorCode: 'INSUFFICIENT_BALANCE',
        currentBalance: error.currentBalance
      });
    }

    // 기타 비즈니스 로직 에러 처리
    if (error.message.includes('수량') || error.message.includes('사용자')) {
      return res.status(400).json({
        success: false,
        error: error.message,
        errorCode: 'BUSINESS_LOGIC_ERROR'
      });
    }

    // 기타 에러는 다음 미들웨어로 전달
    next(error);
  }
};

/**
 * 전체 거래 내역 조회
 *
 * GET /api/transactions
 *
 * 쿼리 파라미터:
 * - limit: 조회 개수 (기본값: 100, 최대: 1000)
 * - offset: 시작 위치 (기본값: 0)
 * - orderBy: 정렬 기준 (기본값: created_at)
 * - orderDir: 정렬 방향 (ASC | DESC, 기본값: DESC)
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
 */
exports.getAllTransactions = async (req, res, next) => {
  try {
    // 쿼리 파라미터 파싱
    const limit = parseInt(req.query.limit, 10) || 100;
    const offset = parseInt(req.query.offset, 10) || 0;
    const orderBy = req.query.orderBy || 'created_at';
    const orderDir = req.query.orderDir || 'DESC';

    // 서비스 레이어 호출
    const result = await transactionService.getAllTransactions({
      limit,
      offset,
      orderBy,
      orderDir
    });

    // 응답
    res.status(200).json({
      success: true,
      data: {
        transactions: result.transactions.map(t => ({
          id: t.id,
          user_name: t.user_name,
          type: t.type,
          quantity: t.quantity,
          created_at: t.created_at
        })),
        pagination: result.pagination
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * 현재 잔여 주차권 수량 조회
 *
 * GET /api/transactions/balance
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
 * 계산 방식:
 * - balance_view를 활용하여 효율적으로 조회
 * - totalPurchased: type='purchase'인 quantity의 합계
 * - totalUsed: type='use'인 quantity의 합계
 * - balance: totalPurchased - totalUsed
 */
exports.getBalance = async (req, res, next) => {
  try {
    // 서비스 레이어 호출
    const balance = await transactionService.getBalance();

    res.status(200).json({
      success: true,
      data: balance
    });

  } catch (error) {
    next(error);
  }
};

/**
 * 특정 사용자의 거래 내역 조회
 *
 * GET /api/transactions/user/:name
 *
 * URL 파라미터:
 * - name: 사용자 이름
 *
 * 쿼리 파라미터:
 * - limit: 조회 개수 (기본값: 100)
 * - offset: 시작 위치 (기본값: 0)
 *
 * 응답:
 * {
 *   "success": true,
 *   "data": {
 *     "userName": "홍길동",
 *     "balance": {
 *       "totalPurchased": 50,
 *       "totalUsed": 20,
 *       "balance": 30
 *     },
 *     "transactions": [...],
 *     "pagination": {
 *       "limit": 100,
 *       "offset": 0,
 *       "total": 15,
 *       "hasMore": false
 *     }
 *   }
 * }
 */
exports.getUserTransactions = async (req, res, next) => {
  try {
    const userName = req.params.name;

    // 사용자 이름 검증
    if (!userName || userName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '사용자 이름이 필요합니다.',
        errorCode: 'MISSING_USER_NAME'
      });
    }

    // 쿼리 파라미터 파싱
    const limit = parseInt(req.query.limit, 10) || 100;
    const offset = parseInt(req.query.offset, 10) || 0;

    // 서비스 레이어 호출 (사용자 잔액 조회)
    const userBalance = await transactionService.getUserBalance(userName);

    // 서비스 레이어 호출 (사용자 거래 내역 조회)
    const result = await transactionService.getUserTransactions(userName, {
      limit,
      offset
    });

    // 응답
    res.status(200).json({
      success: true,
      data: {
        userName: userName,
        balance: userBalance,
        transactions: result.transactions.map(t => ({
          id: t.id,
          user_name: t.user_name,
          type: t.type,
          quantity: t.quantity,
          created_at: t.created_at
        })),
        pagination: result.pagination
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * 데이터베이스 통계 조회 (관리자용)
 *
 * GET /api/transactions/stats
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
 * - get_database_stats() 스토어드 함수를 활용하여 모니터링 메트릭 제공
 * - 관리자 대시보드나 모니터링 시스템에서 활용
 */
exports.getStats = async (req, res, next) => {
  try {
    // 서비스 레이어 호출
    const stats = await transactionService.getDatabaseStats();

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    next(error);
  }
};

/**
 * 헬스 체크 (서버 상태 확인)
 *
 * GET /api/health
 *
 * 응답:
 * {
 *   "success": true,
 *   "data": {
 *     "status": "healthy",
 *     "timestamp": "2024-01-01T00:00:00.000Z",
 *     "database": "connected"
 *   }
 * }
 */
exports.healthCheck = async (req, res, next) => {
  try {
    // 데이터베이스 연결 확인
    await sequelize.authenticate();

    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        environment: process.env.NODE_ENV || 'development'
      }
    });

  } catch (error) {
    res.status(503).json({
      success: false,
      error: '서버가 일시적으로 사용 불가능합니다.',
      errorCode: 'SERVICE_UNAVAILABLE',
      details: {
        database: 'disconnected'
      }
    });
  }
};
