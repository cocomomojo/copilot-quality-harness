/**
 * PII フィルタ実装例
 * 
 * 目的:
 * - trace ログ、テスト出力から個人情報（メール、トークン、IP等）を除去
 * - 診断に必要な情報は保持（置換トークンで識別可能に）
 * - trace-summary.json 生成前の前処理として使用
 * 
 * 使用例:
 *   import { sanitizeText, sanitizeJsonFile } from './pii-filter';
 *   const cleaned = sanitizeText(rawTrace);
 *   sanitizeJsonFile('./trace.json');  // インプレース編集
 */

import fs from 'fs';
import path from 'path';

// ============================================================
// PII 検出用正規表現
// ============================================================

/** メールアドレス */
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** JWT トークン、API キー等 */
const TOKEN_RE = /\b(?:eyJ[a-zA-Z0-9_-]{10,}\b|token=[A-Za-z0-9._-]{20,}|api[_-]?key[=:]\s*[A-Za-z0-9._-]{20,})/gi;

/** IPv4 アドレス */
const IP_V4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

/** UUID */
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** クレジットカード番号（簡易版） */
const CREDIT_CARD_RE = /\b(?:\d{4}[\s-]?){3}\d{4}\b/g;

/** 電話番号（日本） */
const PHONE_JP_RE = /\b(?:0\d{1,4}[- ]?\d{1,4}[- ]?\d{4}|090[- ]?\d{4}[- ]?\d{4})\b/g;

/** ソーシャルセキュリティ番号等（XX-XX-XXXX パターン） */
const SSN_RE = /\b\d{2}-\d{2}-\d{4}\b/g;

/** マイナンバー（日本: 12 桁） */
const MYNUMBER_RE = /\b\d{12}\b/g;

/** パスワード含むログ行（例: password=xxx） */
const PASSWORD_LOG_RE = /(?:password|passwd|pwd|secret|key)[\s:=]+([^\s,}'"]+)/gi;

/** データベース接続文字列（ユーザー名・パスワード） */
const DB_CONN_RE = /(?:mysql|postgres|mongodb):\/\/([^:]+):([^@]+)@/gi;

// ============================================================
// 置換トークン定義
// ============================================================

interface ReplacementMap {
  [key: string]: { count: number; token: string };
}

const REPLACEMENT_TOKENS = {
  EMAIL: '[REDACTED_EMAIL]',
  TOKEN: '[REDACTED_TOKEN]',
  IP: '[REDACTED_IP]',
  UUID: '[REDACTED_UUID]',
  CREDIT_CARD: '[REDACTED_CREDIT_CARD]',
  PHONE: '[REDACTED_PHONE]',
  SSN: '[REDACTED_SSN]',
  MYNUMBER: '[REDACTED_MYNUMBER]',
  PASSWORD: '[REDACTED_PASSWORD]',
  DB_CONN: '[REDACTED_DB_CONNECTION]',
};

// ============================================================
// メイン PII フィルタ関数
// ============================================================

/**
 * テキスト内の PII を置換する
 * @param input - 入力テキスト
 * @returns PII が置換されたテキスト
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }

  let output = input;

  // 1. メールアドレス
  output = output.replace(EMAIL_RE, REPLACEMENT_TOKENS.EMAIL);

  // 2. トークン・API キー
  output = output.replace(TOKEN_RE, REPLACEMENT_TOKENS.TOKEN);

  // 3. IPv4 アドレス
  output = output.replace(IP_V4_RE, REPLACEMENT_TOKENS.IP);

  // 4. UUID
  output = output.replace(UUID_RE, REPLACEMENT_TOKENS.UUID);

  // 5. クレジットカード
  output = output.replace(CREDIT_CARD_RE, REPLACEMENT_TOKENS.CREDIT_CARD);

  // 6. 電話番号（日本）
  output = output.replace(PHONE_JP_RE, REPLACEMENT_TOKENS.PHONE);

  // 7. SSN
  output = output.replace(SSN_RE, REPLACEMENT_TOKENS.SSN);

  // 8. マイナンバー
  output = output.replace(MYNUMBER_RE, REPLACEMENT_TOKENS.MYNUMBER);

  // 9. パスワードを含むログ
  output = output.replace(PASSWORD_LOG_RE, (match, p1) => {
    return match.replace(p1, REPLACEMENT_TOKENS.PASSWORD);
  });

  // 10. DB 接続文字列（ユーザー名・パスワード）
  output = output.replace(DB_CONN_RE, (match, user, pass) => {
    return match.replace(user, '[REDACTED_USER]').replace(pass, REPLACEMENT_TOKENS.DB_CONN);
  });

  return output;
}

/**
 * JSON ファイルを読み込んで PII をフィルタリング、上書き
 * @param filePath - JSON ファイルパス
 * @returns フィルタリング後の JSON オブジェクト
 */
export function sanitizeJsonFile(filePath: string): Record<string, any> {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const sanitized = sanitizeText(raw);
    
    // ファイルに上書き
    fs.writeFileSync(filePath, sanitized, 'utf8');
    
    // JSON をパースして返す
    return JSON.parse(sanitized);
  } catch (error) {
    console.error(`[PII Filter] Error processing file ${filePath}:`, error);
    throw error;
  }
}

/**
 * JSON オブジェクトを再帰的に PII フィルタリング（インプレース）
 * @param obj - JSON オブジェクト
 * @returns フィルタリング済みオブジェクト
 */
export function sanitizeJsonObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeJsonObject(item));
  }
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeJsonObject(value);
    }
    return sanitized;
  }
  return obj;
}

/**
 * ディレクトリ内の全 JSON ファイルをフィルタリング
 * @param dirPath - ディレクトリパス
 * @param pattern - ファイル名パターン（デフォルト: *.json）
 */
export function sanitizeDirectory(dirPath: string, pattern: string = '*.json'): void {
  try {
    const files = fs.readdirSync(dirPath);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    for (const file of jsonFiles) {
      const filePath = path.join(dirPath, file);
      try {
        sanitizeJsonFile(filePath);
        console.log(`[PII Filter] ✓ Sanitized: ${filePath}`);
      } catch (error) {
        console.error(`[PII Filter] ✗ Failed: ${filePath}`, error);
      }
    }
  } catch (error) {
    console.error(`[PII Filter] Error reading directory ${dirPath}:`, error);
  }
}

// ============================================================
// 監査ログ用補助関数
// ============================================================

/**
 * PII フィルタリングの統計情報を集計
 * @param original - 元のテキスト
 * @param sanitized - フィルタ後のテキスト
 * @returns 統計情報オブジェクト
 */
export function analyzeFiltering(original: string, sanitized: string): Record<string, number> {
  const stats: Record<string, number> = {};

  for (const [key, token] of Object.entries(REPLACEMENT_TOKENS)) {
    const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    stats[key] = (sanitized.match(regex) || []).length;
  }

  return stats;
}

/**
 * PII 除去サマリーをログ出力
 * @param filePath - 処理したファイルパス
 * @param stats - 統計情報（analyzeFiltering の結果）
 */
export function logSanitizationSummary(filePath: string, stats: Record<string, number>): void {
  console.log(`\n[PII Filter Summary] ${filePath}`);
  console.log('='.repeat(60));
  
  let totalRemoved = 0;
  for (const [type, count] of Object.entries(stats)) {
    if (count > 0) {
      console.log(`  ${type}: ${count} items redacted`);
      totalRemoved += count;
    }
  }
  
  if (totalRemoved === 0) {
    console.log('  ✓ No PII detected');
  } else {
    console.log(`  ────────────────────`);
    console.log(`  Total: ${totalRemoved} items redacted`);
  }
  console.log('='.repeat(60));
}

// ============================================================
// CLI インターフェース（ダイレクト実行用）
// ============================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  npx ts-node scripts/pii-filter.ts <filePath>    - Filter single file');
    console.log('  npx ts-node scripts/pii-filter.ts <dirPath>     - Filter all JSON in directory');
    process.exit(1);
  }

  const targetPath = args[0];
  const stat = fs.statSync(targetPath);

  if (stat.isFile()) {
    const raw = fs.readFileSync(targetPath, 'utf8');
    const sanitized = sanitizeText(raw);
    const stats = analyzeFiltering(raw, sanitized);
    
    fs.writeFileSync(targetPath, sanitized, 'utf8');
    logSanitizationSummary(targetPath, stats);
  } else if (stat.isDirectory()) {
    sanitizeDirectory(targetPath);
  } else {
    console.error(`Error: ${targetPath} is neither file nor directory`);
    process.exit(1);
  }
}

export default {
  sanitizeText,
  sanitizeJsonFile,
  sanitizeJsonObject,
  sanitizeDirectory,
  analyzeFiltering,
  logSanitizationSummary,
};
