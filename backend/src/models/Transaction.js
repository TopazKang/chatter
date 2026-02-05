/**
 * Transaction 모델 정의
 *
 * 주차권 구매/사용 거래를 기록하는 모델입니다.
 *
 * 설계 철학:
 * - 단일 테이블 접근법: 구매와 사용을 모두 하나의 테이블에 저장
 * - 감사 추적(Audit Trail): 모든 거래 이력을 영구 보관
 * - 집계 용이성: SUM 함수만으로 잔여 수량 계산 가능
 *
 * 테이블 구조:
 * - id: 기본키 (자동 증가)
 * - user_name: 직원 이름
 * - type: 거래 유형 (purchase/use)
 * - quantity: 수량 (양수만 허용)
 * - created_at: 거래 생성 시간
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Transaction 모델 정의
 *
 * 필드 설명:
 * - id: 고유 식별자 (자동 생성)
 * - user_name: 사용자 이름 (필수, 최대 100자)
 * - type: 거래 타입 (purchase 또는 use만 허용)
 * - quantity: 주차권 수량 (필수, 양수만 허용)
 * - created_at: 생성 시간 (자동 생성)
 */
const Transaction = sequelize.define('Transaction', {
  // 기본키
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '거래 고유 ID'
  },

  // 사용자 이름
  user_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: '사용자 이름은 필수 항목입니다.'
      },
      len: {
        args: [1, 100],
        msg: '사용자 이름은 1자 이상 100자 이하여야 합니다.'
      }
    },
    comment: '직원 이름'
  },

  // 거래 유형 (구매 또는 사용)
  type: {
    type: DataTypes.ENUM('purchase', 'use'),
    allowNull: false,
    validate: {
      isIn: {
        args: [['purchase', 'use']],
        msg: '거래 유형은 purchase 또는 use만 가능합니다.'
      }
    },
    comment: '거래 유형 (purchase: 구매, use: 사용)'
  },

  // 수량
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: {
        msg: '수량은 정수여야 합니다.'
      },
      min: {
        args: [1],
        msg: '수량은 1 이상이어야 합니다.'
      },
      max: {
        args: [10000],
        msg: '수량은 10000 이하여야 합니다.'
      }
    },
    comment: '주차권 수량 (양수)'
  },

  // 생성 시간 (자동 설정)
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '거래 생성 시간'
  }
}, {
  // 테이블 옵션
  tableName: 'transactions',
  timestamps: false, // createdAt, updatedAt 자동 생성 비활성화 (created_at 직접 관리)

  // 인덱스 설정 (성능 최적화)
  indexes: [
    {
      name: 'idx_transactions_user_name',
      fields: ['user_name'],
      comment: '사용자별 조회 최적화'
    },
    {
      name: 'idx_transactions_created_at',
      fields: ['created_at'],
      comment: '시간별 조회 및 정렬 최적화'
    },
    {
      name: 'idx_transactions_type',
      fields: ['type'],
      comment: '거래 유형별 필터링 최적화'
    },
    {
      name: 'idx_transactions_composite',
      fields: ['user_name', 'type', 'created_at'],
      comment: '복합 조회 최적화'
    }
  ],

  // 후크 (Hook) - 비즈니스 로직
  hooks: {
    // 데이터 저장 전 검증 로직
    beforeCreate: (transaction, options) => {
      // 사용자 이름 앞뒤 공백 제거
      transaction.user_name = transaction.user_name.trim();

      // 로깅 (개발 환경)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔔 새 거래 생성: ${transaction.user_name} - ${transaction.type} - ${transaction.quantity}개`);
      }
    }
  }
});

/**
 * 전체 잔여 수량 조회 메서드
 *
 * SQL:
 * SELECT
 *   SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) as total_purchased,
 *   SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END) as total_used
 * FROM transactions;
 *
 * @returns {Promise<Object>} { totalPurchased, totalUsed, balance }
 */
Transaction.getBalance = async function() {
  const result = await sequelize.query(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END), 0) as total_purchased,
      COALESCE(SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END), 0) as total_used,
      COALESCE(
        SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) -
        SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END),
        0
      ) as balance
    FROM transactions;
  `, {
    type: sequelize.QueryTypes.SELECT,
    raw: true
  });

  return {
    totalPurchased: parseInt(result[0].total_purchased, 10),
    totalUsed: parseInt(result[0].total_used, 10),
    balance: parseInt(result[0].balance, 10)
  };
};

/**
 * 사용자별 잔여 수량 조회 메서드
 *
 * @param {string} userName - 조회할 사용자 이름
 * @returns {Promise<Object>} { userName, totalPurchased, totalUsed, balance }
 */
Transaction.getUserBalance = async function(userName) {
  const result = await sequelize.query(`
    SELECT
      user_name,
      COALESCE(SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END), 0) as total_purchased,
      COALESCE(SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END), 0) as total_used,
      COALESCE(
        SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) -
        SUM(CASE WHEN type = 'use' THEN quantity ELSE 0 END),
        0
      ) as balance
    FROM transactions
    WHERE user_name = :userName
    GROUP BY user_name;
  `, {
    replacements: { userName },
    type: sequelize.QueryTypes.SELECT,
    raw: true
  });

  if (result.length === 0) {
    return {
      userName,
      totalPurchased: 0,
      totalUsed: 0,
      balance: 0
    };
  }

  return {
    userName: result[0].user_name,
    totalPurchased: parseInt(result[0].total_purchased, 10),
    totalUsed: parseInt(result[0].total_used, 10),
    balance: parseInt(result[0].balance, 10)
  };
};

/**
 * 사용자별 거래 내역 조회 메서드
 *
 * @param {string} userName - 조회할 사용자 이름
 * @param {Object} options - 조회 옵션 (limit, offset, order)
 * @returns {Promise<Array>} 거래 내역 배열
 */
Transaction.getUserTransactions = async function(userName, options = {}) {
  const {
    limit = 100,
    offset = 0,
    order = [['created_at', 'DESC']]
  } = options;

  return await Transaction.findAll({
    where: { user_name: userName },
    limit,
    offset,
    order
  });
};

module.exports = Transaction;
