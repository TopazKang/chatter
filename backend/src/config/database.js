/**
 * 데이터베이스 설정 파일
 *
 * Sequelize ORM을 사용하여 PostgreSQL 데이터베이스에 연결합니다.
 *
 * 주요 기능:
 * - 환경 변수를 통한 설정 관리
 * - 연결 재시도 로직 (최대 5회)
 * - 연결 풀 설정 (동시성 최적화)
 * - 로깅 설정 (개발/프로덕션 환경 분리)
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

// 환경 변수 로드
const {
  DB_HOST = 'localhost',
  DB_PORT = 5432,
  DB_NAME = 'parking_management',
  DB_USER = 'parking_user',
  DB_PASSWORD = 'parking_password_secure_123',
  NODE_ENV = 'development'
} = process.env;

/**
 * Sequelize 인스턴스 생성
 *
 * 설정 근거:
 * - dialect: PostgreSQL 사용
 * - pool: 동시 연결 수 관리 (최소 5개, 최대 20개)
 * - logging: 개발 환경에서만 SQL 쿼리 로깅
 * - dialectOptions: SSL 설정 (프로덕션 환경)
 */
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',

  // 연결 풀 설정 (성능 최적화)
  pool: {
    max: 20,        // 최대 동시 연결 수
    min: 5,         // 최소 유지 연결 수
    acquire: 30000, // 연결 획득 최대 대기 시간 (30초)
    idle: 10000     // 연결 종료 전 유휴 시간 (10초)
  },

  // 로깅 설정
  logging: NODE_ENV === 'development' ? console.log : false,

  // 타임존 설정 (한국 시간)
  timezone: '+09:00',

  // PostgreSQL 특화 옵션
  dialectOptions: {
    // 프로덕션 환경에서 SSL 사용
    ssl: NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },

  // 쿼리 재시도 설정
  retry: {
    max: 3
  }
});

/**
 * 데이터베이스 연결 테스트 함수
 *
 * 재시도 로직 포함:
 * - 최대 5회 재시도
 * - 각 재시도 간 5초 대기
 * - 연결 실패 시 명확한 에러 메시지 출력
 *
 * @returns {Promise<void>}
 */
const connectWithRetry = async (maxRetries = 5, retryDelay = 5000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await sequelize.authenticate();
      console.log('✅ 데이터베이스 연결 성공 (PostgreSQL)');
      console.log(`📊 데이터베이스: ${DB_NAME}@${DB_HOST}:${DB_PORT}`);
      return;
    } catch (error) {
      console.error(`❌ 데이터베이스 연결 실패 (시도 ${i + 1}/${maxRetries})`);
      console.error(`에러: ${error.message}`);

      if (i < maxRetries - 1) {
        console.log(`⏳ ${retryDelay / 1000}초 후 재시도합니다...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('💥 데이터베이스 연결 최대 재시도 횟수 초과');
        throw error;
      }
    }
  }
};

/**
 * 모델 동기화 함수
 *
 * 주의사항:
 * - alter: true는 개발 환경에서만 사용
 * - 프로덕션에서는 마이그레이션 파일 사용 권장
 *
 * @returns {Promise<void>}
 */
const syncDatabase = async () => {
  try {
    // 개발 환경: 스키마 자동 업데이트
    // 프로덕션 환경: 동기화 비활성화 (마이그레이션 사용)
    if (NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ 데이터베이스 스키마 동기화 완료');
    }
  } catch (error) {
    console.error('❌ 데이터베이스 동기화 실패:', error.message);
    throw error;
  }
};

/**
 * 데이터베이스 연결 종료 함수
 *
 * Graceful Shutdown 시 호출
 *
 * @returns {Promise<void>}
 */
const closeDatabase = async () => {
  try {
    await sequelize.close();
    console.log('✅ 데이터베이스 연결 종료');
  } catch (error) {
    console.error('❌ 데이터베이스 종료 실패:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  connectWithRetry,
  syncDatabase,
  closeDatabase
};
