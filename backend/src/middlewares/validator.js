/**
 * 입력 검증 미들웨어
 *
 * API 요청의 입력 데이터를 검증합니다.
 *
 * 보안 원칙:
 * - 클라이언트 검증은 UX 향상용, 서버 검증은 보안 필수
 * - 모든 입력은 신뢰할 수 없다고 가정
 * - 화이트리스트 방식으로 검증
 *
 * 검증 레이어:
 * 1차: 미들웨어 (기본 형식 검증)
 * 2차: 컨트롤러 (비즈니스 로직 검증)
 * 3차: 모델 (데이터베이스 제약 조건)
 */

/**
 * 거래 생성 요청 검증
 *
 * 검증 항목:
 * - user_name: 필수, 문자열, 1-100자
 * - type: 필수, 'purchase' 또는 'use'만 허용
 * - quantity: 필수, 양의 정수, 1-10000
 *
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 * @param {Function} next - 다음 미들웨어 함수
 */
exports.validateCreateTransaction = (req, res, next) => {
  const { user_name, type, quantity } = req.body;
  const errors = [];

  // user_name 검증
  if (!user_name) {
    errors.push('사용자 이름(user_name)은 필수 항목입니다.');
  } else if (typeof user_name !== 'string') {
    errors.push('사용자 이름(user_name)은 문자열이어야 합니다.');
  } else if (user_name.trim().length === 0) {
    errors.push('사용자 이름(user_name)은 빈 문자열일 수 없습니다.');
  } else if (user_name.length > 100) {
    errors.push('사용자 이름(user_name)은 100자 이하여야 합니다.');
  }

  // type 검증
  if (!type) {
    errors.push('거래 유형(type)은 필수 항목입니다.');
  } else if (!['purchase', 'use'].includes(type)) {
    errors.push('거래 유형(type)은 "purchase" 또는 "use"만 가능합니다.');
  }

  // quantity 검증
  if (quantity === undefined || quantity === null) {
    errors.push('수량(quantity)은 필수 항목입니다.');
  } else {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty)) {
      errors.push('수량(quantity)은 숫자여야 합니다.');
    } else if (!Number.isInteger(qty)) {
      errors.push('수량(quantity)은 정수여야 합니다.');
    } else if (qty < 1) {
      errors.push('수량(quantity)은 1 이상이어야 합니다.');
    } else if (qty > 10000) {
      errors.push('수량(quantity)은 10000 이하여야 합니다.');
    }
  }

  // 검증 실패 시 에러 응답
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: '입력 데이터가 올바르지 않습니다.',
      errorCode: 'VALIDATION_ERROR',
      details: errors
    });
  }

  // 검증 성공 시 다음 미들웨어로
  next();
};

/**
 * 페이지네이션 파라미터 검증
 *
 * 검증 항목:
 * - limit: 선택, 양의 정수, 1-1000 (기본값: 100)
 * - offset: 선택, 0 이상의 정수 (기본값: 0)
 *
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 * @param {Function} next - 다음 미들웨어 함수
 */
exports.validatePagination = (req, res, next) => {
  const { limit, offset } = req.query;
  const errors = [];

  // limit 검증
  if (limit !== undefined) {
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum)) {
      errors.push('limit은 숫자여야 합니다.');
    } else if (limitNum < 1) {
      errors.push('limit은 1 이상이어야 합니다.');
    } else if (limitNum > 1000) {
      errors.push('limit은 1000 이하여야 합니다.');
    }
  }

  // offset 검증
  if (offset !== undefined) {
    const offsetNum = parseInt(offset, 10);
    if (isNaN(offsetNum)) {
      errors.push('offset은 숫자여야 합니다.');
    } else if (offsetNum < 0) {
      errors.push('offset은 0 이상이어야 합니다.');
    }
  }

  // 검증 실패 시 에러 응답
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: '페이지네이션 파라미터가 올바르지 않습니다.',
      errorCode: 'INVALID_PAGINATION',
      details: errors
    });
  }

  next();
};

/**
 * 사용자 이름 파라미터 검증
 *
 * URL 파라미터의 사용자 이름을 검증합니다.
 *
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 * @param {Function} next - 다음 미들웨어 함수
 */
exports.validateUserName = (req, res, next) => {
  const { name } = req.params;
  const errors = [];

  // name 검증
  if (!name) {
    errors.push('사용자 이름(name)은 필수 항목입니다.');
  } else if (typeof name !== 'string') {
    errors.push('사용자 이름(name)은 문자열이어야 합니다.');
  } else if (name.trim().length === 0) {
    errors.push('사용자 이름(name)은 빈 문자열일 수 없습니다.');
  } else if (name.length > 100) {
    errors.push('사용자 이름(name)은 100자 이하여야 합니다.');
  }

  // 검증 실패 시 에러 응답
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: '사용자 이름이 올바르지 않습니다.',
      errorCode: 'INVALID_USER_NAME',
      details: errors
    });
  }

  next();
};

/**
 * Content-Type 검증 미들웨어
 *
 * POST/PUT 요청 시 Content-Type이 application/json인지 확인합니다.
 *
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 * @param {Function} next - 다음 미들웨어 함수
 */
exports.validateContentType = (req, res, next) => {
  // POST, PUT 요청만 검증
  if (req.method === 'POST' || req.method === 'PUT') {
    const contentType = req.get('Content-Type');

    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        success: false,
        error: 'Content-Type은 application/json이어야 합니다.',
        errorCode: 'UNSUPPORTED_MEDIA_TYPE'
      });
    }
  }

  next();
};

/**
 * 요청 본문 크기 검증
 *
 * 요청 본문이 너무 크면 거부합니다. (DoS 공격 방지)
 *
 * Express의 body-parser에서 설정한 limit보다 이전에 체크합니다.
 *
 * @param {number} maxSize - 최대 허용 크기 (바이트)
 * @returns {Function} 미들웨어 함수
 */
exports.validateBodySize = (maxSize = 10 * 1024) => { // 기본값: 10KB
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length'), 10);

    if (contentLength && contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        error: `요청 본문이 너무 큽니다. (최대 ${maxSize} 바이트)`,
        errorCode: 'PAYLOAD_TOO_LARGE'
      });
    }

    next();
  };
};

/**
 * SQL Injection 방어를 위한 입력 필터링
 *
 * 위험한 SQL 키워드를 포함하는 입력을 차단합니다.
 * (ORM 사용 시 대부분 방어되지만, 추가 방어선으로 활용)
 *
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 * @param {Function} next - 다음 미들웨어 함수
 */
exports.validateSqlInjection = (req, res, next) => {
  // 위험한 SQL 패턴 (대소문자 구분 없음)
  const dangerousPatterns = [
    /(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b)/gi,
    /(\bEXEC\b|\bEXECUTE\b|\bUNION\b|\bSELECT\b)/gi,
    /(;|\-\-|\/\*|\*\/)/g
  ];

  // 검증할 필드
  const fieldsToCheck = [
    req.body.user_name,
    req.params.name,
    req.query.orderBy
  ].filter(Boolean);

  // 각 필드에서 위험한 패턴 검색
  for (const field of fieldsToCheck) {
    for (const pattern of dangerousPatterns) {
      if (pattern.test(field)) {
        return res.status(400).json({
          success: false,
          error: '입력 데이터에 허용되지 않는 문자가 포함되어 있습니다.',
          errorCode: 'INVALID_INPUT'
        });
      }
    }
  }

  next();
};
