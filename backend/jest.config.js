/**
 * Jest 설정 파일
 *
 * 백엔드 테스트 환경을 구성합니다.
 *
 * 설정 항목:
 * - 테스트 환경: Node.js
 * - 커버리지 리포트: HTML, JSON, 터미널
 * - 커버리지 임계값: 80% 이상
 * - 타임아웃: 10초 (데이터베이스 연결 대기)
 *
 * 당위성:
 * - 테스트 환경을 표준화하여 일관된 결과 보장
 * - 코드 커버리지 측정으로 테스트 품질 관리
 * - 타임아웃 설정으로 CI/CD 파이프라인 안정성 확보
 */

module.exports = {
  // 테스트 환경 설정
  testEnvironment: 'node',

  // 테스트 파일 패턴
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // 커버리지 수집 대상
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js', // 메인 진입점 제외
    '!src/scripts/**', // 마이그레이션 스크립트 제외
    '!**/node_modules/**'
  ],

  // 커버리지 리포트 형식
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'json',
    'lcov'
  ],

  // 커버리지 임계값 (프로덕션 레벨)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // 커버리지 디렉토리
  coverageDirectory: 'coverage',

  // 타임아웃 설정 (10초)
  testTimeout: 10000,

  // 테스트 실행 전 설정 파일 (선택사항)
  // setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // 모듈 경로 매핑 (절대 경로 사용 시)
  moduleDirectories: [
    'node_modules',
    'src'
  ],

  // 테스트 실행 옵션
  verbose: true, // 상세 출력
  forceExit: true, // 테스트 완료 후 강제 종료
  clearMocks: true, // 각 테스트 후 모킹 데이터 정리
  restoreMocks: true, // 각 테스트 후 모킹 복원

  // 느린 테스트 경고 (5초)
  slowTestThreshold: 5,

  // 최대 worker 수 (병렬 실행)
  maxWorkers: '50%',

  // 에러 메시지 스택 트레이스 제한 해제
  errorOnDeprecated: true
};
