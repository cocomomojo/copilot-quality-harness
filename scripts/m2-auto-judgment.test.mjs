import { describe, it } from 'node:test';
import assert from 'node:assert';
import { judgeAutoImplementation, JudgmentLevel, RiskFactors } from './m2-auto-judgment.mjs';

describe('M2 Auto-Judgment', () => {
  describe('judgeAutoImplementation', () => {
    it('should return SAFE_PROCEED for simple frontend-only issue', () => {
      const report = {
        issue: {
          title: 'フロントエンド: ボタンの色を変更',
          description: 'ボタンを青から赤に変更します',
          acceptanceCriteria: ['ボタンが赤く表示されること'],
          testRequirements: ['ボタンの色が赤いことを確認'],
          severity: 'low',
          scope: ['Frontend'],
          automationAllowed: true
        }
      };
      
      const judgment = judgeAutoImplementation(report, 'moderate');
      assert.strictEqual(judgment.level, JudgmentLevel.SAFE_PROCEED);
    });
    
    it('should detect security-related issue', () => {
      const report = {
        issue: {
          title: '【セキュリティ】パスワード暗号化の実装',
          description: 'ユーザーパスワードを暗号化して保存します',
          acceptanceCriteria: ['パスワードが暗号化される'],
          testRequirements: ['暗号化テスト'],
          severity: 'high',
          scope: ['Backend'],
          automationAllowed: true
        }
      };
      
      const judgment = judgeAutoImplementation(report, 'moderate');
      assert.strictEqual(judgment.level, JudgmentLevel.MANUAL_ONLY);
      assert(judgment.factors.includes(RiskFactors.SECURITY) || judgment.factors.includes(RiskFactors.BACKEND_CHANGES));
    });
    
    it('should return MANUAL_ONLY for missing acceptance criteria', () => {
      const report = {
        issue: {
          title: 'Issue without criteria',
          description: 'No acceptance criteria provided',
          acceptanceCriteria: [],
          testRequirements: ['Test'],
          severity: 'low',
          scope: ['Frontend'],
          automationAllowed: true
        }
      };
      
      const judgment = judgeAutoImplementation(report, 'moderate');
      assert.strictEqual(judgment.level, JudgmentLevel.MANUAL_ONLY);
      assert(judgment.factors.includes(RiskFactors.MISSING_INFO));
    });
    
    it('should return NEEDS_APPROVAL for high severity issue in strict mode', () => {
      const report = {
        issue: {
          title: 'フロントエンド: 重大なバグ修正',
          description: 'クリティカルなバグを修正します',
          acceptanceCriteria: ['バグが修正される'],
          testRequirements: ['バグ修正テスト'],
          severity: 'high',
          scope: ['Frontend'],
          automationAllowed: true
        }
      };
      
      const judgment = judgeAutoImplementation(report, 'strict');
      assert.strictEqual(judgment.level, JudgmentLevel.MANUAL_ONLY);
    });
    
    it('should return NEEDS_APPROVAL for high severity issue in moderate mode', () => {
      const report = {
        issue: {
          title: 'フロントエンド: 重大なバグ修正',
          description: 'クリティカルなバグを修正します',
          acceptanceCriteria: ['バグが修正される'],
          testRequirements: ['バグ修正テスト'],
          severity: 'high',
          scope: ['Frontend'],
          automationAllowed: true
        }
      };
      
      const judgment = judgeAutoImplementation(report, 'moderate');
      assert.strictEqual(judgment.level, JudgmentLevel.NEEDS_APPROVAL);
    });
    
    it('should return MANUAL_ONLY for backend scope in strict mode', () => {
      const report = {
        issue: {
          title: 'API エンドポイント追加',
          description: '新しい API エンドポイントを追加',
          acceptanceCriteria: ['エンドポイントが動作する'],
          testRequirements: ['API テスト'],
          severity: 'low',
          scope: ['Backend'],
          automationAllowed: true
        }
      };
      
      const judgment = judgeAutoImplementation(report, 'strict');
      assert.strictEqual(judgment.level, JudgmentLevel.MANUAL_ONLY);
      assert(judgment.factors.includes(RiskFactors.BACKEND_CHANGES));
    });
    
    it('should return SAFE_PROCEED when no report issue', () => {
      const report = {};
      const judgment = judgeAutoImplementation(report, 'moderate');
      assert.strictEqual(judgment.level, JudgmentLevel.MANUAL_ONLY);
    });
    
    it('should detect personal data keywords', () => {
      const report = {
        issue: {
          title: '【個人情報】ユーザーメールアドレス保存機能',
          description: '個人データとしてメールアドレスを保存します',
          acceptanceCriteria: ['メールアドレスが保存される'],
          testRequirements: ['保存テスト'],
          severity: 'low',
          scope: ['Frontend'],
          automationAllowed: true
        }
      };
      
      const judgment = judgeAutoImplementation(report, 'moderate');
      assert.strictEqual(judgment.level, JudgmentLevel.MANUAL_ONLY);
      assert(judgment.factors.includes(RiskFactors.PERSONAL_DATA));
    });
  });
});
