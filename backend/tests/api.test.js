/**
 * API 통합 테스트
 *
 * Jest와 Supertest를 사용하여 API 엔드포인트를 테스트합니다.
 *
 * 실행 방법:
 * npm test
 *
 * 주의: 테스트 실행 전 데이터베이스 연결 필요
 */

const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/config/database');
const Transaction = require('../src/models/Transaction');

// 테스트 전 데이터베이스 연결 및 초기화
beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true }); // 테스트용 DB 초기화
});

// 테스트 후 연결 종료
afterAll(async () => {
  await sequelize.close();
});

// 각 테스트 전 데이터 정리
beforeEach(async () => {
  await Transaction.destroy({ where: {}, truncate: true });
});

describe('POST /api/transactions', () => {
  test('주차권 구매 기록 생성 성공', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .send({
        user_name: '홍길동',
        type: 'purchase',
        quantity: 10
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user_name).toBe('홍길동');
    expect(response.body.data.type).toBe('purchase');
    expect(response.body.data.quantity).toBe(10);
  });

  test('주차권 사용 기록 생성 성공', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .send({
        user_name: '김철수',
        type: 'use',
        quantity: 3
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.type).toBe('use');
  });

  test('필수 필드 누락 시 실패', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .send({
        user_name: '홍길동'
        // type, quantity 누락
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  test('잘못된 type 값으로 실패', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .send({
        user_name: '홍길동',
        type: 'invalid_type',
        quantity: 10
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  test('음수 수량으로 실패', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .send({
        user_name: '홍길동',
        type: 'purchase',
        quantity: -5
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});

describe('GET /api/transactions', () => {
  test('전체 거래 내역 조회 성공', async () => {
    // 테스트 데이터 생성
    await Transaction.create({ user_name: '홍길동', type: 'purchase', quantity: 10 });
    await Transaction.create({ user_name: '김철수', type: 'use', quantity: 3 });

    const response = await request(app)
      .get('/api/transactions')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.transactions).toHaveLength(2);
    expect(response.body.data.pagination.total).toBe(2);
  });

  test('페이지네이션 동작 확인', async () => {
    // 10개의 거래 생성
    for (let i = 0; i < 10; i++) {
      await Transaction.create({ user_name: `사용자${i}`, type: 'purchase', quantity: 1 });
    }

    const response = await request(app)
      .get('/api/transactions?limit=5&offset=0')
      .expect(200);

    expect(response.body.data.transactions).toHaveLength(5);
    expect(response.body.data.pagination.hasMore).toBe(true);
  });
});

describe('GET /api/transactions/balance', () => {
  test('잔여 수량 조회 성공', async () => {
    // 구매 50, 사용 20 → 잔여 30
    await Transaction.create({ user_name: '홍길동', type: 'purchase', quantity: 50 });
    await Transaction.create({ user_name: '김철수', type: 'use', quantity: 20 });

    const response = await request(app)
      .get('/api/transactions/balance')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.totalPurchased).toBe(50);
    expect(response.body.data.totalUsed).toBe(20);
    expect(response.body.data.balance).toBe(30);
  });

  test('거래 내역 없을 때 0 반환', async () => {
    const response = await request(app)
      .get('/api/transactions/balance')
      .expect(200);

    expect(response.body.data.balance).toBe(0);
  });
});

describe('GET /api/transactions/user/:name', () => {
  test('특정 사용자의 거래 내역 조회', async () => {
    await Transaction.create({ user_name: '홍길동', type: 'purchase', quantity: 10 });
    await Transaction.create({ user_name: '홍길동', type: 'use', quantity: 3 });
    await Transaction.create({ user_name: '김철수', type: 'purchase', quantity: 5 });

    const response = await request(app)
      .get('/api/transactions/user/홍길동')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.transactions).toHaveLength(2);
    expect(response.body.data.balance.totalPurchased).toBe(10);
    expect(response.body.data.balance.totalUsed).toBe(3);
    expect(response.body.data.balance.balance).toBe(7);
  });

  test('존재하지 않는 사용자 조회 시 빈 배열 반환', async () => {
    const response = await request(app)
      .get('/api/transactions/user/존재하지않는사용자')
      .expect(200);

    expect(response.body.data.transactions).toHaveLength(0);
    expect(response.body.data.balance.balance).toBe(0);
  });
});

describe('GET /health', () => {
  test('헬스 체크 성공', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('healthy');
    expect(response.body.data.database).toBe('connected');
  });
});

describe('CORS', () => {
  test('CORS 헤더 확인', async () => {
    const response = await request(app)
      .get('/api/transactions/balance')
      .set('Origin', 'http://localhost')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });
});
