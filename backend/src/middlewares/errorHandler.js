/**
 * 에러 핸들링 미들웨어
 *
 * Express의 전역 에러 핸들러입니다.
 *
 * 에러 처리 전략:
 * - 개발 환경: 상세한 에러 정보 및 스택 트레이스 제공
 * - 프로덕션 환경: 사용자 친화적인 메시지만 제공 (내부 정보 숨김)
 * - 모든 에러를 로깅하여 디버깅 및 모니터링
 *
 * 에러 타입별 처리:
 * - Sequelize 에러: 데이터베이스 관련 에러
 * - Validation 에러: 입력 검증 실패
 * - 404 에러: 리소스를 찾을 수 없음
 * - 500 에러: 예기치 않은 서버 에러
 */

/**
 * 404 Not Found 핸들러
 *
 * 정의되지 않은 라우트에 대한 요청을 처리합니다.
 *
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
exports.notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `요청한 경로를 찾을 수 없습니다: ${req.method} ${req.path}`,
    errorCode: 'NOT_FOUND',
    details: {
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * 전역 에러 핸들러
 *
 * 모든 라우트에서 발생한 에러를 처리합니다.
 *
 * @param {Error} err - 에러 객체
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 * @param {Function} next - 다음 미들웨어 함수
 */
exports.errorHandler = (err, req, res, next) => {
  // 에러 로깅
  console.error('❌ 에러 발생:');
  console.error(`   경로: ${req.method} ${req.path}`);
  console.error(`   메시지: ${err.message}`);
  console.error(`   스택: ${err.stack}`);

  // 에러 타입별 처리
  let statusCode = err.statusCode || 500;
  let errorResponse = {
    success: false,
    error: '서버 내부 오류가 발생했습니다.',
    errorCode: 'INTERNAL_SERVER_ERROR'
  };

  // Sequelize 데이터베이스 에러
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    errorResponse = {
      success: false,
      error: '데이터 검증에 실패했습니다.',
      errorCode: 'VALIDATION_ERROR',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    };
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    errorResponse = {
      success: false,
      error: '중복된 데이터가 존재합니다.',
      errorCode: 'DUPLICATE_ENTRY',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    };
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    errorResponse = {
      success: false,
      error: '참조 무결성 제약 조건 위반입니다.',
      errorCode: 'FOREIGN_KEY_CONSTRAINT',
      details: {
        message: err.message
      }
    };
  } else if (err.name === 'SequelizeDatabaseError') {
    statusCode = 500;
    errorResponse = {
      success: false,
      error: '데이터베이스 오류가 발생했습니다.',
      errorCode: 'DATABASE_ERROR'
    };
  } else if (err.name === 'SequelizeConnectionError') {
    statusCode = 503;
    errorResponse = {
      success: false,
      error: '데이터베이스에 연결할 수 없습니다.',
      errorCode: 'DATABASE_CONNECTION_ERROR'
    };
  }

  // JSON 파싱 에러
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    errorResponse = {
      success: false,
      error: 'JSON 형식이 올바르지 않습니다.',
      errorCode: 'INVALID_JSON'
    };
  }

  // 타임아웃 에러
  else if (err.code === 'ETIMEDOUT') {
    statusCode = 504;
    errorResponse = {
      success: false,
      error: '요청 시간이 초과되었습니다.',
      errorCode: 'TIMEOUT'
    };
  }

  // 커스텀 에러 (statusCode와 message가 설정된 경우)
  else if (err.statusCode && err.message) {
    statusCode = err.statusCode;
    errorResponse = {
      success: false,
      error: err.message,
      errorCode: err.errorCode || 'CUSTOM_ERROR'
    };
  }

  // 개발 환경에서는 상세한 에러 정보 포함
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.timestamp = new Date().toISOString();
    errorResponse.request = {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body
    };
  }

  // 응답 전송
  res.status(statusCode).json(errorResponse);
};

/**
 * Async 핸들러 래퍼
 *
 * async 함수를 래핑하여 에러를 자동으로 next()로 전달합니다.
 *
 * 사용 예:
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.findAll();
 *   res.json(users);
 * }));
 *
 * @param {Function} fn - async 함수
 * @returns {Function} Express 미들웨어 함수
 */
exports.asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 커스텀 에러 클래스
 *
 * 명시적인 에러를 발생시킬 때 사용합니다.
 *
 * 사용 예:
 * throw new AppError('사용자를 찾을 수 없습니다', 404, 'USER_NOT_FOUND');
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true; // 운영상 예상 가능한 에러

    Error.captureStackTrace(this, this.constructor);
  }
}

exports.AppError = AppError;

/**
 * 프로세스 레벨 에러 핸들러
 *
 * uncaughtException 및 unhandledRejection 처리
 */
exports.setupProcessErrorHandlers = () => {
  // Uncaught Exception 핸들러
  process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:');
    console.error(err);
    console.error('서버를 안전하게 종료합니다...');

    // 프로세스 종료 (PM2 등이 자동으로 재시작)
    process.exit(1);
  });

  // Unhandled Promise Rejection 핸들러
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise);
    console.error('Reason:', reason);

    // 로깅 후 계속 실행 (필요 시 프로세스 종료)
    // process.exit(1);
  });

  // SIGTERM 핸들러 (Graceful Shutdown)
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM 신호 수신. 서버를 종료합니다...');
    // 여기서 서버 종료 로직 실행
  });

  // SIGINT 핸들러 (Ctrl+C)
  process.on('SIGINT', () => {
    console.log('🛑 SIGINT 신호 수신 (Ctrl+C). 서버를 종료합니다...');
    process.exit(0);
  });
};
