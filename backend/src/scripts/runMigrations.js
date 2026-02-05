/**
 * 데이터베이스 마이그레이션 실행 스크립트
 *
 * 목적:
 * - 백엔드 시작 시 데이터베이스 마이그레이션을 자동으로 실행
 * - 스토어드 프로시저 및 뷰 생성
 * - 초기 데이터 시드 (옵션)
 *
 * 사용법:
 * node src/scripts/runMigrations.js
 *
 * 당위성:
 * - Docker Compose로 배포 시 마이그레이션이 자동으로 실행되어야 함
 * - 개발 환경에서도 일관된 데이터베이스 스키마 유지
 * - init.sql은 초기 테이블만 생성하므로, 추가 마이그레이션을 별도로 실행
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// 데이터베이스 연결 설정
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'parking_management',
  user: process.env.DB_USER || 'parking_user',
  password: process.env.DB_PASSWORD || 'parking_password_secure_123'
});

/**
 * 마이그레이션 파일 실행
 *
 * @param {string} filePath - 마이그레이션 파일 경로
 * @param {string} fileName - 파일 이름 (로깅용)
 */
async function executeMigration(filePath, fileName) {
  try {
    console.log(`📄 ${fileName} 실행 중...`);

    // 파일 읽기
    const sql = await fs.readFile(filePath, 'utf-8');

    // SQL 실행
    await pool.query(sql);

    console.log(`✅ ${fileName} 실행 완료`);
    return true;

  } catch (error) {
    console.error(`❌ ${fileName} 실행 실패:`, error.message);

    // 이미 존재하는 객체 에러는 무시 (멱등성 보장)
    if (error.message.includes('already exists')) {
      console.log(`ℹ️  ${fileName}: 이미 존재하는 객체 건너뜀`);
      return true;
    }

    throw error;
  }
}

/**
 * 마이그레이션 파일 목록 조회
 *
 * @param {string} migrationDir - 마이그레이션 디렉토리 경로
 * @returns {Promise<Array>} 마이그레이션 파일 목록
 */
async function getMigrationFiles(migrationDir) {
  try {
    const files = await fs.readdir(migrationDir);

    // .sql 파일만 필터링 및 정렬
    return files
      .filter(file => file.endsWith('.sql'))
      .sort(); // 파일명 기준 정렬 (001_, 002_, ...)

  } catch (error) {
    console.error('마이그레이션 파일 조회 실패:', error.message);
    return [];
  }
}

/**
 * 모든 마이그레이션 실행
 */
async function runAllMigrations() {
  console.log('🚀 데이터베이스 마이그레이션 시작...\n');

  const startTime = Date.now();

  try {
    // 데이터베이스 연결 확인
    await pool.query('SELECT 1');
    console.log('✅ 데이터베이스 연결 성공\n');

    // 마이그레이션 디렉토리 경로
    const migrationDir = path.join(__dirname, '../../../database/migrations');
    console.log(`📂 마이그레이션 디렉토리: ${migrationDir}\n`);

    // 마이그레이션 파일 목록 조회
    const migrationFiles = await getMigrationFiles(migrationDir);

    if (migrationFiles.length === 0) {
      console.log('⚠️  실행할 마이그레이션 파일이 없습니다.');
      return;
    }

    console.log(`📋 총 ${migrationFiles.length}개의 마이그레이션 파일 발견:\n`);
    migrationFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log('');

    // 각 마이그레이션 파일 실행
    for (const file of migrationFiles) {
      const filePath = path.join(migrationDir, file);
      await executeMigration(filePath, file);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n🎉 모든 마이그레이션 실행 완료!');
    console.log(`⏱️  소요 시간: ${duration}초\n`);

  } catch (error) {
    console.error('\n❌ 마이그레이션 실행 중 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);

  } finally {
    // 데이터베이스 연결 종료
    await pool.end();
  }
}

/**
 * 시드 데이터 실행 (선택 사항)
 *
 * @param {boolean} shouldSeed - 시드 데이터 실행 여부
 */
async function runSeeds(shouldSeed = false) {
  if (!shouldSeed) {
    return;
  }

  console.log('\n🌱 시드 데이터 삽입 시작...\n');

  try {
    const seedDir = path.join(__dirname, '../../../database/seeds');
    const seedFiles = await getMigrationFiles(seedDir);

    if (seedFiles.length === 0) {
      console.log('⚠️  실행할 시드 파일이 없습니다.');
      return;
    }

    console.log(`📋 총 ${seedFiles.length}개의 시드 파일 발견:\n`);

    for (const file of seedFiles) {
      const filePath = path.join(seedDir, file);
      await executeMigration(filePath, file);
    }

    console.log('\n✅ 시드 데이터 삽입 완료!\n');

  } catch (error) {
    console.error('\n⚠️  시드 데이터 삽입 실패:', error.message);
    // 시드 데이터 실패는 치명적이지 않으므로 계속 진행
  }
}

// 스크립트 실행
if (require.main === module) {
  // 명령줄 인자 파싱
  const args = process.argv.slice(2);
  const shouldSeed = args.includes('--seed');

  // 마이그레이션 실행
  runAllMigrations()
    .then(() => runSeeds(shouldSeed))
    .catch((error) => {
      console.error('스크립트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { runAllMigrations, runSeeds };
