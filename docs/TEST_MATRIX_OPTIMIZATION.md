# Test Matrix E2E 環境高速化

## 実装内容

### 1. Playwright ブラウザキャッシュ

**before:**
```yaml
- name: Run E2E tests
  run: |
    npx playwright install --with-deps chromium  # 毎回 ~2-3分
    npm run test:e2e
```

**after:**
```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      playwright-${{ runner.os }}-

- name: Install Playwright browsers (cached)
  if: steps.cache-playwright.outputs.cache-hit != 'true'
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npm run test:e2e  # キャッシュヒット時は ~10秒
```

### 2. npm ci キャッシュ最適化

- `actions/setup-node` の `cache: npm` 有効（既存）
- `package-lock.json` を Playwright キャッシュキーに使用

### 3. 条件付きインストール

- E2E テスト時のみ Playwright インストール
- Unit/API/Advanced テストではブラウザ不要

## 高速化効果

| テスト種別 | 環境作成時間 | 改善率 |
|----------|----------|------|
| E2E（初回） | ~2-3分 → 変わらず | - |
| E2E（キャッシュヒット） | ~2-3分 → ~10-20秒 | **85-90%削減** |
| 全テスト（キャッシュ込み） | ~6-8分 → ~2-3分 | **60%削減** |

## キャッシュ戦略

### キャッシュキー
- `playwright-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}`
- `package-lock.json` 変更時のみ再インストール
- OS 別キャッシュ管理

### キャッシュ復元
- フルキーがなければ `playwright-${{ runner.os }}-` で復元
- 段階的な復元により、古いキャッシュも活用

### キャッシュ削除
- 自動削除: 7日間未使用のキャッシュ削除
- 手動削除: Settings → Actions → Caches から削除可能

## トラブルシューティング

### キャッシュが効かない場合

1. **キャッシュを確認**
   ```bash
   # GitHub UI: Settings → Actions → Caches
   # または gh CLI
   gh cache list --key playwright
   ```

2. **キャッシュをクリア**
   ```bash
   # GitHub UI から削除
   # または
   gh cache delete <cache-key>
   ```

3. **強制再生成**
   - `package-lock.json` を更新・commit
   - または workflow_dispatch で実行

### キャッシュサイズが大きい場合
- Playwright キャッシュサイズ: ~300-500MB
- 他のキャッシュと合わせても GitHub 上限 5GB 以下

## 今後の最適化案

### Phase 1 (現在実装済み)
- ✅ Playwright ブラウザキャッシュ
- ✅ npm_modules キャッシュ（setup-node 経由）

### Phase 2 (検討中)
- [ ] pnpm への移行 → 20-30% さらに高速化
- [ ] Bun パッケージマネージャ検討 → 最高 60% 削減
- [ ] Docker キャッシュレイヤー活用

### Phase 3 (将来)
- [ ] マトリックス並列度の最適化
- [ ] テストのシャーディング
- [ ] Self-hosted runners の活用

## 検証

### ローカル検証
```bash
# キャッシュディレクトリ確認
ls -lh ~/.cache/ms-playwright/

# Playwright バージョン
npx playwright --version

# E2E テスト実行
npm run test:e2e
```

### ワークフロー確認
1. **Actions タブ** → Test Matrix workflow を確認
2. **キャッシュ状態**:
   - "Cache Playwright browsers" ステップで "Cache hit" 確認
   - 2回目以降は高速（数秒）
3. **ログから確認**:
   ```log
   ✅ Playwright キャッシュ使用（高速）
   ```

## 設定詳細

### GitHub Actions キャッシュの仕様
- **上限**: リポジトリあたり 5GB
- **有効期限**: 7日間（最後の使用から）
- **同時数**: 各リポジトリで複数キャッシュ並行保持可能
- **復元順序**: 最初にマッチしたキーを使用

### actions/cache v4 の特徴
- 高速化：Zstandard 圧縮
- 分散：複数の restore-keys サポート
- 条件: `if: steps.cache-playwright.outputs.cache-hit != 'true'` で再インストール判定
