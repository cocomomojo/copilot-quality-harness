/**
 * Authentication Module
 * Handles email validation, password validation, and user registration
 * 
 * Security Requirements:
 * - Password must never be logged in plain text
 * - Email addresses should be masked in logs
 * - Password must be hashed before database storage
 */

/**
 * Email バリデーション (RFC 5322 簡易版)
 * 基本的なメールアドレス形式チェック
 * 
 * @param email メールアドレス
 * @returns 有効な場合 true
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // 基本的なメールフォーマット: xxx@yyy.zzz
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Password バリデーション
 * 要件:
 * - 英字（大文字・小文字）を含む
 * - 数字を含む
 * - 8文字以上
 * 
 * @param password パスワード
 * @returns 有効な場合 true
 */
export function validatePassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }

  // 英字を含むか確認（大文字・小文字）
  const hasLetters = /[a-zA-Z]/.test(password);
  if (!hasLetters) {
    return false;
  }

  // 数字を含むか確認
  const hasNumbers = /[0-9]/.test(password);
  if (!hasNumbers) {
    return false;
  }

  // 8文字以上か確認
  if (password.length < 8) {
    return false;
  }

  return true;
}

/**
 * メールアドレスをマスク化（PII保護）
 * 例: sensitive@example.com → sen***@***
 * 
 * @param email メールアドレス
 * @returns マスク化されたメールアドレス
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) {
    return email;
  }
  
  // ローカルパートの最初の3文字のみ表示
  const maskedLocal = localPart.substring(0, 3) + '***';
  return `${maskedLocal}@***`;
}

/**
 * ユーザー登録
 * メールアドレスとパスワードを検証して、ユーザー登録を処理
 * 
 * Security Measures:
 * - Password は平文でログに出力しない
 * - Email はマスク化してログに出力
 * - 実装時に bcrypt でハッシュ化（この実装では省略）
 * 
 * @param email メールアドレス
 * @param password パスワード
 * @returns { success: boolean; error?: string }
 */
export function registerUser(
  email: string,
  password: string
): { success: boolean; error?: string } {
  // メールアドレスバリデーション
  if (!validateEmail(email)) {
    return {
      success: false,
      error: 'Invalid email format'
    };
  }

  // パスワードバリデーション
  if (!validatePassword(password)) {
    return {
      success: false,
      error: 'Password must contain letters and numbers (8+ chars)'
    };
  }

  // 🔒 PII マスク化してログ出力
  const maskedEmail = maskEmail(email);
  console.log(`[INFO] User registration attempt: ${maskedEmail}`);

  // ここで実際のDB保存処理を行う
  // 重要: パスワードは必ず bcrypt などでハッシュ化してから保存
  // const hashedPassword = await bcrypt.hash(password, 10);
  // await db.users.create({ email, passwordHash: hashedPassword });

  console.log(`[INFO] User registration successful for ${maskedEmail}`);

  return { success: true };
}

/**
 * ユーザーログイン検証（実装例）
 * 
 * @param email メールアドレス
 * @param password パスワード
 * @returns { isValid: boolean; message: string }
 */
export function validateLogin(
  email: string,
  password: string
): { isValid: boolean; message: string } {
  // メールアドレス形式チェック
  if (!validateEmail(email)) {
    return {
      isValid: false,
      message: 'Invalid email format'
    };
  }

  // パスワード形式チェック
  if (!password || password.length === 0) {
    return {
      isValid: false,
      message: 'Password is required'
    };
  }

  // 実装時:
  // 1. DB から email に対応するユーザーを検索
  // 2. ユーザーが見つかったら、入力パスワードと保存されたハッシュを比較
  // 3. bcrypt.compare(password, storedHash) で検証

  const maskedEmail = maskEmail(email);
  console.log(`[INFO] Login attempt for ${maskedEmail}`);

  return {
    isValid: true,
    message: 'Credentials valid'
  };
}

export default {
  validateEmail,
  validatePassword,
  registerUser,
  validateLogin
};
