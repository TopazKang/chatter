/**
 * Transaction 컨트롤러
 *
 * API 엔드포인트의 비즈니스 로직을 처리합니다.
 *
 * 책임:
 * - 요청 데이터 처리
 * - 모델 메서드 호출
 * - 응답 데이터 포맷팅
 * - 에러 핸들링
 *
 * 패턴: Controller Layer (MVC 패턴의 일부)
 */

const Transaction = require('../models/Transaction');
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
 *     "id": 1,
 *     "user_name": "홍길동",
 *     "type": "purchase",
 *     "quantity": 5,
 *     "created_at": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 *
 * 에러 케이스:
 * - 필수 필드 누락
 * - 잘못된 type 값
 * - 음수 또는 0 수량
 * - 데이터베이스 연결 실패
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

    // 거래 생성
    const transaction = await Transaction.create({
      user_name: userName,
      type,
      quantity: qty
    });

    // 성공 응답
    res.status(201).json({
      success: true,
      data: {
        id: transaction.id,
        user_name: transaction.user_name,
        type: transaction.type,
        quantity: transaction.quantity,
        created_at: transaction.created_at
      }
    });

  } catch (error) {
    // Sequelize 검증 에러 처리
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: error.errors.map(e => e.message).join(', '),
        errorCode: 'VALIDATION_ERROR'
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
 * - order: 정렬 기준 (기본값: created_at DESC)
 *
 * 응답:
 * {
 *   "success": true,
 *   "data": {
 *     "transactions": [...],
 *     "pagination": {
 *       "limit": 100,
 *       "offset": 0,
 *       "total": 250
 *     }
 *   }
 * }
 */
exports.getAllTransactions = async (req, res, next) => {
  try {
    // 쿼리 파라미터 파싱
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
    const offset = parseInt(req.query.offset, 10) || 0;
    const orderField = req.query.orderBy || 'created_at';
    const orderDirection = req.query.orderDir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 정렬 필드 검증 (SQL Injection 방지)
    const allowedOrderFields = ['id', 'user_name', 'type', 'quantity', 'created_at'];
    const safeOrderField = allowedOrderFields.includes(orderField) ? orderField : 'created_at';

    // 거래 내역 조회
    const { count, rows } = await Transaction.findAndCountAll({
      limit,
      offset,
      order: [[safeOrderField, orderDirection]]
    });

    // 응답
    res.status(200).json({
      success: true,
      data: {
        transactions: rows.map(t => ({
          id: t.id,
          user_name: t.user_name,
          type: t.type,
          quantity: t.quantity,
          created_at: t.created_at
        })),
        pagination: {
          limit,
          offset,
          total: count,
          hasMore: offset + limit < count
        }
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
 * - totalPurchased: type='purchase'인 quantity의 합계
 * - totalUsed: type='use'인 quantity의 합계
 * - balance: totalPurchased - totalUsed
 */
exports.getBalance = async (req, res, next) => {
  try {
    // 잔여 수량 조회 (Transaction 모델의 정적 메서드 사용)
    const balance = await Transaction.getBalance();

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
 *       "total": 15
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
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
    const offset = parseInt(req.query.offset, 10) || 0;

    // 사용자 잔여 수량 조회
    const userBalance = await Transaction.getUserBalance(userName);

    // 사용자 거래 내역 조회
    const transactions = await Transaction.getUserTransactions(userName, {
      limit,
      offset
    });

    // 전체 거래 수 조회
    const totalCount = await Transaction.count({
      where: { user_name: userName }
    });

    // 응답
    res.status(200).json({
      success: true,
      data: {
        userName: userName,
        balance: userBalance,
        transactions: transactions.map(t => ({
          id: t.id,
          user_name: t.user_name,
          type: t.type,
          quantity: t.quantity,
          created_at: t.created_at
        })),
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount
        }
      }
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
