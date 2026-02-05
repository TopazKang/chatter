/**
 * CORS (Cross-Origin Resource Sharing) 설정 미들웨어
 *
 * 프론트엔드 애플리케이션에서 백엔드 API를 호출할 수 있도록 CORS를 설정합니다.
 *
 * 보안 원칙:
 * - 프로덕션 환경: 특정 도메인만 허용 (화이트리스트)
 * - 개발 환경: localhost 허용 (개발 편의성)
 * - 허용 메서드: GET, POST만 허용 (필요한 것만)
 * - 인증 정보 포함 허용 (credentials: true)
 *
 * CORS 정책 설계 근거:
 * - 브라우저의 Same-Origin Policy 우회를 위해 필요
 * - XSS 공격 방지를 위해 허용 도메인 제한
 * - Preflight 요청(OPTIONS) 지원
 */

const cors = require('cors');

/**
 * CORS 설정 옵션
 *
 * origin: 허용할 도메인 (함수로 동적 검증)
 * methods: 허용할 HTTP 메서드
 * allowedHeaders: 허용할 요청 헤더
 * credentials: 쿠키 등 인증 정보 포함 허용
 * maxAge: Preflight 결과 캐싱 시간 (초)
 */
const corsOptions = {
  /**
   * origin 검증 함수
   *
   * 환경 변수에서 허용 도메인을 읽어 화이트리스트 방식으로 검증합니다.
   *
   * @param {string} origin - 요청 출처
   * @param {Function} callback - 검증 결과 콜백
   */
  origin: (origin, callback) => {
    // 허용할 도메인 목록 (환경 변수 또는 기본값)
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : [
          'http://localhost',
          'http://localhost:80',
          'http://localhost:3000',
          'http://localhost:5173' // Vite 개발 서버
        ];

    // 개발 환경: 모든 localhost 허용
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push(
        'http://127.0.0.1',
        'http://127.0.0.1:80',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173'
      );
    }

    // origin이 없는 경우 (예: 모바일 앱, Postman)
    if (!origin) {
      return callback(null, true);
    }

    // 화이트리스트 검증
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS 거부: ${origin}`);
      callback(new Error('CORS 정책에 의해 차단되었습니다.'));
    }
  },

  /**
   * 허용할 HTTP 메서드
   *
   * 현재 필요한 메서드만 허용 (최소 권한 원칙)
   */
  methods: ['GET', 'POST', 'OPTIONS'],

  /**
   * 허용할 요청 헤더
   *
   * Content-Type: JSON 요청에 필요
   * Authorization: 향후 인증 기능 추가 시 사용
   */
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With'
  ],

  /**
   * 클라이언트에 노출할 응답 헤더
   */
  exposedHeaders: [
    'Content-Length',
    'Content-Type'
  ],

  /**
   * 인증 정보(쿠키, 인증 헤더 등) 포함 허용
   *
   * 향후 세션 기반 인증 또는 JWT 사용 시 필요
   */
  credentials: true,

  /**
   * Preflight 요청 결과 캐싱 시간 (초)
   *
   * 브라우저가 OPTIONS 요청 결과를 캐싱하는 시간
   * 86400초 = 24시간
   */
  maxAge: 86400,

  /**
   * Preflight 요청에 대한 성공 상태 코드
   */
  optionsSuccessStatus: 204
};

/**
 * CORS 미들웨어 생성
 *
 * 사용 예:
 * app.use(corsMiddleware);
 */
const corsMiddleware = cors(corsOptions);

/**
 * 커스텀 CORS 에러 핸들러
 *
 * CORS 정책 위반 시 사용자 친화적인 에러 메시지를 반환합니다.
 *
 * @param {Error} err - 에러 객체
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 * @param {Function} next - 다음 미들웨어 함수
 */
const corsErrorHandler = (err, req, res, next) => {
  if (err.message === 'CORS 정책에 의해 차단되었습니다.') {
    return res.status(403).json({
      success: false,
      error: 'CORS 정책에 의해 차단되었습니다.',
      errorCode: 'CORS_BLOCKED',
      details: {
        origin: req.headers.origin,
        message: '허용되지 않은 도메인에서의 요청입니다.'
      }
    });
  }

  next(err);
};

/**
 * CORS Preflight 요청 로깅 미들웨어
 *
 * OPTIONS 요청을 로깅하여 CORS 문제를 디버깅합니다.
 *
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 * @param {Function} next - 다음 미들웨어 함수
 */
const corsLogger = (req, res, next) => {
  if (req.method === 'OPTIONS' && process.env.NODE_ENV === 'development') {
    console.log(`🔍 CORS Preflight 요청:`);
    console.log(`   Origin: ${req.headers.origin}`);
    console.log(`   Method: ${req.headers['access-control-request-method']}`);
    console.log(`   Headers: ${req.headers['access-control-request-headers']}`);
  }

  next();
};

module.exports = {
  corsMiddleware,
  corsErrorHandler,
  corsLogger,
  corsOptions
};
