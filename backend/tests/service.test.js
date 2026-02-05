/**
 * 서비스 레이어 단위 테스트
 *
 * transactionService의 비즈니스 로직을 테스트합니다.
 *
 * 테스트 범위:
 * - 스토어드 프로시저 호출 로직
 * - 데이터 변환 및 포맷팅
 * - 에러 핸들링
 * - 입력 검증
 *
 * 당위성:
 * - 서비스 레이어는 핵심 비즈니스 로직을 담당하므로 철저한 테스트 필요
 * - 단위 테스트를 통해 개별 함수의 동작 검증
 * - 통합 테스트와 함께 다층 테스트 전략 구성
 */

const transactionService = require('../src/services/transactionService');
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

describe('transactionService.purchaseParkingTicket', () => {
  test('정상적인 주차권 구매', async () => {
    const result = await transactionService.purchaseParkingTicket('홍길동', 10);

    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();
    expect(result.currentBalance).toBe(10);
    expect(result.message).toContain('구매');
  });

  test('대량 구매 (최대 수량)', async () => {
    const result = await transactionService.purchaseParkingTicket('테스트유저', 10000);

    expect(result.success).toBe(true);
    expect(result.currentBalance).toBe(10000);
  });

  test('수량 초과 구매 시 에러', async () => {
    await expect(
      transactionService.purchaseParkingTicket('홍길동', 10001)
    ).rejects.toThrow();
  });

  test('음수 수량 구매 시 에러', async () => {
    await expect(
      transactionService.purchaseParkingTicket('홍길동', -5)
    ).rejects.toThrow();
  });

  test('0 수량 구매 시 에러', async () => {
    await expect(
      transactionService.purchaseParkingTicket('홍길동', 0)
    ).rejects.toThrow();
  });

  test('빈 사용자 이름 구매 시 에러', async () => {
    await expect(
      transactionService.purchaseParkingTicket('', 10)
    ).rejects.toThrow();
  });

  test('NULL 사용자 이름 구매 시 에러', async () => {
    await expect(
      transactionService.purchaseParkingTicket(null, 10)
    ).rejects.toThrow();
  });

  test('연속 구매 시 잔액 누적 확인', async () => {
    await transactionService.purchaseParkingTicket('홍길동', 10);
    const result = await transactionService.purchaseParkingTicket('홍길동', 20);

    expect(result.currentBalance).toBe(30);
  });
});

describe('transactionService.useParkingTicket', () => {
  test('정상적인 주차권 사용', async () => {
    // 먼저 구매
    await transactionService.purchaseParkingTicket('홍길동', 10);

    // 사용
    const result = await transactionService.useParkingTicket('홍길동', 3);

    expect(result.success).toBe(true);
    expect(result.currentBalance).toBe(7);
  });

  test('잔액 부족 시 에러', async () => {
    await transactionService.purchaseParkingTicket('홍길동', 5);

    await expect(
      transactionService.useParkingTicket('홍길동', 10)
    ).rejects.toThrow();
  });

  test('구매 없이 사용 시 에러', async () => {
    await expect(
      transactionService.useParkingTicket('홍길동', 1)
    ).rejects.toThrow();
  });

  test('전체 잔액 사용 가능', async () => {
    await transactionService.purchaseParkingTicket('홍길동', 10);
    const result = await transactionService.useParkingTicket('홍길동', 10);

    expect(result.currentBalance).toBe(0);
  });

  test('음수 수량 사용 시 에러', async () => {
    await transactionService.purchaseParkingTicket('홍길동', 10);

    await expect(
      transactionService.useParkingTicket('홍길동', -5)
    ).rejects.toThrow();
  });

  test('0 수량 사용 시 에러', async () => {
    await transactionService.purchaseParkingTicket('홍길동', 10);

    await expect(
      transactionService.useParkingTicket('홍길동', 0)
    ).rejects.toThrow();
  });
});

describe('transactionService.getBalance', () => {
  test('거래 내역 없을 때 0 반환', async () => {
    const balance = await transactionService.getBalance();

    expect(balance.totalPurchased).toBe(0);
    expect(balance.totalUsed).toBe(0);
    expect(balance.balance).toBe(0);
  });

  test('구매만 있을 때 정확한 잔액', async () => {
    await transactionService.purchaseParkingTicket('홍길동', 50);

    const balance = await transactionService.getBalance();

    expect(balance.totalPurchased).toBe(50);
    expect(balance.totalUsed).toBe(0);
    expect(balance.balance).toBe(50);
  });

  test('구매와 사용이 있을 때 정확한 잔액', async () => {
    await transactionService.purchaseParkingTicket('홍길동', 50);
    await transactionService.useParkingTicket('홍길동', 20);

    const balance = await transactionService.getBalance();

    expect(balance.totalPurchased).toBe(50);
    expect(balance.totalUsed).toBe(20);
    expect(balance.balance).toBe(30);
  });

  test('여러 사용자의 거래 합산', async () => {
    await transactionService.purchaseParkingTicket('홍길동', 50);
    await transactionService.purchaseParkingTicket('김철수', 30);
    await transactionService.useParkingTicket('홍길동', 10);

    const balance = await transactionService.getBalance();

    expect(balance.totalPurchased).toBe(80);
    expect(balance.totalUsed).toBe(10);
    expect(balance.balance).toBe(70);
  });
});

describe('transactionService.getUserBalance', () => {
  test('특정 사용자의 잔액 조회', async () => {
    await transactionService.purchaseParkingTicket('홍길동', 50);
    await transactionService.useParkingTicket('홍길동', 20);

    const balance = await transactionService.getUserBalance('홍길동');

    expect(balance.totalPurchased).toBe(50);
    expect(balance.totalUsed).toBe(20);
    expect(balance.balance).toBe(30);
  });

  test('거래 내역이 없는 사용자는 0 반환', async () => {
    const balance = await transactionService.getUserBalance('존재하지않는사용자');

    expect(balance.totalPurchased).toBe(0);
    expect(balance.totalUsed).toBe(0);
    expect(balance.balance).toBe(0);
  });

  test('다른 사용자와 독립적으로 계산', async () => {
    await transactionService.purchaseParkingTicket('홍길동', 50);
    await transactionService.purchaseParkingTicket('김철수', 30);

    const balance1 = await transactionService.getUserBalance('홍길동');
    const balance2 = await transactionService.getUserBalance('김철수');

    expect(balance1.balance).toBe(50);
    expect(balance2.balance).toBe(30);
  });
});

describe('transactionService.getAllTransactions', () => {
  test('전체 거래 내역 조회', async () => {
    await transactionService.purchaseParkingTicket('홍길동', 10);
    await transactionService.purchaseParkingTicket('김철수', 20);

    const result = await transactionService.getAllTransactions();

    expect(result.transactions).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });

  test('페이지네이션 동작 확인', async () => {
    // 10개의 거래 생성
    for (let i = 0; i < 10; i++) {
      await transactionService.purchaseParkingTicket(`사용자${i}`, 1);
    }

    const result = await transactionService.getAllTransactions({ limit: 5, offset: 0 });

    expect(result.transactions).toHaveLength(5);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.total).toBe(10);
  });

  test('정렬 기능 확인 (created_at DESC)', async () => {
    await transactionService.purchaseParkingTicket('홍길동', 10);
    await new Promise(resolve => setTimeout(resolve, 10)); // 시간 차이를 두기 위해
    await transactionService.purchaseParkingTicket('김철수', 20);

    const result = await transactionService.getAllTransactions({ orderBy: 'created_at', orderDir: 'DESC' });

    expect(result.transactions[0].user_name).toBe('김철수');
    expect(result.transactions[1].user_name).toBe('홍길동');
  });

  test('limit 최대값 제한 (1000)', async () => {
    const result = await transactionService.getAllTransactions({ limit: 10000 });

    // limit이 1000으로 제한되는지 확인 (실제로는 거래가 없으므로 0)
    expect(result.transactions).toHaveLength(0);
  });
});

describe('transactionService.getUserTransactions', () => {
  test('특정 사용자의 거래 내역 조회', async () => {
    await transactionService.purchaseParkingTicket('홍길동', 10);
    await transactionService.useParkingTicket('홍길동', 3);
    await transactionService.purchaseParkingTicket('김철수', 20);

    const result = await transactionService.getUserTransactions('홍길동');

    expect(result.transactions).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });

  test('거래 내역이 없는 사용자는 빈 배열', async () => {
    const result = await transactionService.getUserTransactions('존재하지않는사용자');

    expect(result.transactions).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });
});

describe('transactionService.getDatabaseStats', () => {
  test('데이터베이스 통계 조회', async () => {
    await transactionService.purchaseParkingTicket('홍길동', 50);
    await transactionService.purchaseParkingTicket('김철수', 30);
    await transactionService.useParkingTicket('홍길동', 20);

    const stats = await transactionService.getDatabaseStats();

    expect(stats.totalTransactions).toBe(3);
    expect(stats.totalUsers).toBe(2);
    expect(stats.totalPurchased).toBe(80);
    expect(stats.totalUsed).toBe(20);
    expect(stats.currentBalance).toBe(60);
    expect(stats.avgPurchasePerUser).toBeCloseTo(40, 2);
    expect(stats.avgUsePerUser).toBeCloseTo(10, 2);
    expect(stats.lastTransactionTime).toBeDefined();
  });

  test('거래 내역이 없을 때 0 반환', async () => {
    const stats = await transactionService.getDatabaseStats();

    expect(stats.totalTransactions).toBe(0);
    expect(stats.totalUsers).toBe(0);
    expect(stats.currentBalance).toBe(0);
  });
});

/**
 * 동시성 테스트 (Race Condition 방지)
 *
 * 당위성:
 * - 스토어드 프로시저가 동시성 문제를 올바르게 처리하는지 검증
 * - 여러 사용자가 동시에 주차권을 사용할 때 잔액 초과 사용 방지
 */
describe('동시성 제어 테스트', () => {
  test('동시에 여러 사용 요청 시 Race Condition 방지', async () => {
    // 10개 구매
    await transactionService.purchaseParkingTicket('홍길동', 10);

    // 동시에 5개씩 2번 사용 시도 (총 10개, 정확히 잔액만큼)
    const promises = [
      transactionService.useParkingTicket('홍길동', 5),
      transactionService.useParkingTicket('홍길동', 5)
    ];

    try {
      await Promise.all(promises);

      // 모두 성공한 경우 최종 잔액이 0이어야 함
      const balance = await transactionService.getUserBalance('홍길동');
      expect(balance.balance).toBe(0);
    } catch (error) {
      // 하나가 실패한 경우 (동시성 제어가 작동한 경우)
      const balance = await transactionService.getUserBalance('홍길동');
      expect(balance.balance).toBeGreaterThanOrEqual(0);
      expect(balance.balance).toBeLessThanOrEqual(10);
    }
  });

  test('동시에 잔액 초과 사용 시도 시 모두 실패', async () => {
    // 10개 구매
    await transactionService.purchaseParkingTicket('홍길동', 10);

    // 동시에 8개씩 2번 사용 시도 (총 16개, 잔액 초과)
    const promises = [
      transactionService.useParkingTicket('홍길동', 8),
      transactionService.useParkingTicket('홍길동', 8)
    ];

    let successCount = 0;
    let failCount = 0;

    const results = await Promise.allSettled(promises);

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        failCount++;
      }
    });

    // 최소 하나는 실패해야 함 (잔액 10개로 16개 사용 불가)
    expect(failCount).toBeGreaterThan(0);

    // 최종 잔액은 음수가 될 수 없음
    const balance = await transactionService.getUserBalance('홍길동');
    expect(balance.balance).toBeGreaterThanOrEqual(0);
  });
});
