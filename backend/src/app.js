/**
 * 메인 애플리케이션 파일
 *
 * Express 애플리케이션을 설정하고 실행합니다.
 *
 * 구조:
 * 1. 의존성 로드
 * 2. 미들웨어 설정
 * 3. 라우트 설정
 * 4. 에러 핸들러 설정
 * 5. 데이터베이스 연결
 * 6. 서버 시작
 *
 * 설계 원칙:
 * - 관심사의 분리 (라우트, 컨트롤러, 미들웨어 분리)
 * - Graceful Shutdown (안전한 서버 종료)
 * - 환경별 설정 (개발/프로덕션)
 */

// ============================================
// 1. 의존성 로드
// ============================================
const express = require('express');
const morgan = require('morgan');
require('dotenv').config();

// 데이터베이스 설정
const {
  connectWithRetry,
  syncDatabase,
  closeDatabase
} = require('./config/database');

// 라우트
const transactionRoutes = require('./routes/transactionRoutes');
const transactionController = require('./controllers/transactionController');

// 미들웨어
const {
  corsMiddleware,
  corsErrorHandler,
  corsLogger
} = require('./middlewares/cors');
const {
  errorHandler,
  notFoundHandler,
  setupProcessErrorHandlers
} = require('./middlewares/errorHandler');
const {
  validateContentType,
  validateBodySize
} = require('./middlewares/validator');

// ============================================
// 2. Express 애플리케이션 생성
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// 3. 글로벌 미들웨어 설정
// ============================================

/**
 * CORS 설정
 *
 * 프론트엔드에서 API 호출을 허용합니다.
 * 반드시 다른 미들웨어보다 먼저 설정해야 합니다.
 */
app.use(corsLogger);
app.use(corsMiddleware);
app.use(corsErrorHandler);

/**
 * 로깅 미들웨어 (Morgan)
 *
 * 모든 HTTP 요청을 로깅합니다.
 * - 개발 환경: 'dev' 포맷 (색상 포함)
 * - 프로덕션 환경: 'combined' 포맷 (Apache 스타일)
 */
const morganFormat = NODE_ENV === 'development' ? 'dev' : 'combined';
app.use(morgan(morganFormat));

/**
 * 요청 본문 파싱 미들웨어
 *
 * JSON 형식의 요청 본문을 파싱합니다.
 * - limit: 요청 본문 최대 크기 (10KB)
 */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/**
 * Content-Type 검증 미들웨어
 */
app.use(validateContentType);

/**
 * 요청 본문 크기 검증 미들웨어
 */
app.use(validateBodySize(10 * 1024)); // 10KB

/**
 * 보안 헤더 설정
 *
 * 기본적인 보안 헤더를 추가합니다.
 */
app.use((req, res, next) => {
  // X-Content-Type-Options: MIME 타입 스니핑 방지
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options: 클릭재킹 방지
  res.setHeader('X-Frame-Options', 'DENY');

  // X-XSS-Protection: XSS 필터 활성화
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Strict-Transport-Security: HTTPS 강제 (프로덕션)
  if (NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

// ============================================
// 4. 라우트 설정
// ============================================

/**
 * 헬스 체크 엔드포인트
 *
 * 서버 상태를 확인합니다.
 * 로드 밸런서나 모니터링 시스템에서 사용합니다.
 */
app.get('/health', transactionController.healthCheck);
app.get('/api/health', transactionController.healthCheck);

/**
 * 루트 엔드포인트
 *
 * API 정보를 반환합니다.
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '회사 주차 관리 서비스 API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      transactions: '/api/transactions',
      balance: '/api/transactions/balance',
      userTransactions: '/api/transactions/user/:name'
    },
    documentation: '/api/docs' // 향후 Swagger 문서 추가
  });
});

/**
 * Transaction API 라우트
 *
 * /api/transactions로 시작하는 모든 요청을 처리합니다.
 */
app.use('/api/transactions', transactionRoutes);

// ============================================
// 5. 에러 핸들러 설정
// ============================================

/**
 * 404 Not Found 핸들러
 *
 * 정의되지 않은 모든 라우트를 처리합니다.
 * 반드시 모든 라우트 정의 후에 추가해야 합니다.
 */
app.use(notFoundHandler);

/**
 * 전역 에러 핸들러
 *
 * 모든 라우트에서 발생한 에러를 처리합니다.
 * 반드시 마지막에 추가해야 합니다.
 */
app.use(errorHandler);

// ============================================
// 6. 서버 시작
// ============================================

/**
 * 서버 시작 함수
 *
 * 데이터베이스 연결 → 서버 시작 순서로 실행합니다.
 */
const startServer = async () => {
  try {
    console.log('🚀 서버 시작 중...');
    console.log(`📌 환경: ${NODE_ENV}`);
    console.log(`📌 포트: ${PORT}`);

    // 1. 데이터베이스 연결
    console.log('\n📊 데이터베이스 연결 중...');
    await connectWithRetry(5, 5000);

    // 2. 데이터베이스 스키마 동기화 (개발 환경만)
    if (NODE_ENV === 'development') {
      console.log('\n🔄 데이터베이스 동기화 중...');
      await syncDatabase();
    }

    // 3. HTTP 서버 시작
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('\n✅ 서버 시작 완료!');
      console.log(`🌐 서버 주소: http://localhost:${PORT}`);
      console.log(`📡 API 엔드포인트: http://localhost:${PORT}/api/transactions`);
      console.log(`💚 헬스 체크: http://localhost:${PORT}/health`);
      console.log('\n서버가 요청을 받을 준비가 되었습니다.\n');
    });

    // 4. Graceful Shutdown 설정
    setupGracefulShutdown(server);

  } catch (error) {
    console.error('❌ 서버 시작 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

/**
 * Graceful Shutdown 설정
 *
 * 서버 종료 시 안전하게 리소스를 정리합니다.
 *
 * @param {Object} server - HTTP 서버 인스턴스
 */
const setupGracefulShutdown = (server) => {
  const shutdown = async (signal) => {
    console.log(`\n🛑 ${signal} 신호 수신. Graceful Shutdown 시작...`);

    // 1. 새로운 연결 거부
    server.close(async () => {
      console.log('✅ HTTP 서버 종료 완료');

      try {
        // 2. 데이터베이스 연결 종료
        await closeDatabase();

        // 3. 프로세스 종료
        console.log('✅ Graceful Shutdown 완료');
        process.exit(0);
      } catch (error) {
        console.error('❌ Shutdown 중 에러 발생:', error.message);
        process.exit(1);
      }
    });

    // 강제 종료 타임아웃 (30초)
    setTimeout(() => {
      console.error('❌ Graceful Shutdown 타임아웃. 강제 종료합니다.');
      process.exit(1);
    }, 30000);
  };

  // SIGTERM, SIGINT 시그널 핸들러 등록
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// ============================================
// 7. 프로세스 레벨 에러 핸들러 설정
// ============================================
setupProcessErrorHandlers();

// ============================================
// 8. 서버 시작 실행
// ============================================
if (require.main === module) {
  // 이 파일이 직접 실행되었을 때만 서버 시작
  // (테스트에서는 서버를 시작하지 않음)
  startServer();
}

// 테스트를 위한 app 내보내기
module.exports = app;
