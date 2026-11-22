# Backend AWS 認証情報と IAM ロール

## アプリ利用者の認証と AWS アクセス権

この2つは別の仕組みです。

- アプリ利用者の email/password 認証は現在のまま Backend の `/api/auth/login` と DynamoDB `Users` テーブルを使用します。IAM ロールはアプリ利用者のログインには使いません。
- IAM ロールは Backend が DynamoDB、S3、SQS API を呼び出すときの AWS 権限です。
- Cognito User Pools 等へのアプリ利用者認証の移行は、この変更では導入していません。将来導入する場合は、ユーザー移行、Frontend の sign-in / sign-up、Backend の JWT 検証、API の user ID mapping、E2E 認証（必要なモックを含む）を別途設計・実装する必要があります。

## 認証情報の選択

`backend/src/lib/aws.js` は環境ごとに次のように設定します。

| 実行環境 | Endpoint | 認証情報 |
|---|---|---|
| ローカル開発・テスト（`NODE_ENV` が `production` 以外） | 既定で `https://127.0.0.1:9297`。`AWS_ENDPOINT_URL` で上書き可能 | Emulator credentials file、またはローカル用 placeholder credentials |
| AWS 本番（`NODE_ENV=production`） | 既定 endpoint なし。通常 AWS endpoint を使用 | AWS SDK default credential provider chain。ECS task role、EC2 instance profile、Lambda execution role など |

本番では `AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`、`AWS_SHARED_CREDENTIALS_FILE` を設定せず、実行環境の IAM ロールに権限を付与してください。SDK の credential provider chain が実行環境から認証情報を取得します。Endpoint も明示的には設定されません。

ローカル開発では従来どおり Emulator credentials を利用できます。これらのローカル用 credentials と自己署名証明書を AWS 環境に持ち込まないでください。

## IAM ロールの作成

[`ops/aws-backend-runtime-role.yaml`](../ops/aws-backend-runtime-role.yaml) は Backend 用の CloudFormation runtime role 例です。DynamoDB のアプリ用テーブル、S3 の対象 bucket object、SQS queue に必要なアクセス権を設定しています。実環境に合わせてリソース名・リージョン・権限を確認し、Backend を実行するサービスに role を割り当ててください。

この role は本番 AWS アカウントで作成・割当するための例です。AWS Emulator が IAM role の割当／認証を完全に再現するものではないため、ローカルでは Emulator credentials を使います。

## Cognito 認証を導入する場合

Cognito User Pool を作成し、既存ユーザーの移行、Frontend の sign-in / sign-up、Backend の JWT 検証、`/api/auth/me` と全保護 API の user ID mapping、E2E の Cognito モックを含む認証方法・テスト手順を別途設計してください。この変更では Cognito を導入していません。
