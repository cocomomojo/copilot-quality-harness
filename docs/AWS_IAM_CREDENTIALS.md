# Backend AWS 認証情報と IAM ロール

## アプリ利用者の認証と AWS アクセス権

この2つは別の仕組みです。

- アプリ利用者の email/password 認証は現在のまま Backend の `/api/auth/login` と DynamoDB `Users` テーブルを使用します。IAM ロールはアプリ利用者のログインを置き換えません。
- IAM ロールは Backend が DynamoDB、S3、SQS API を呼び出すときの AWS 権限です。
- 将来アプリ利用者の認証をマネージド化する場合は Cognito User Pools 等を別途導入し、Backend で発行者・署名・audience を検証する必要があります。Cognito は AWS Emulator の既存サービス構成に含まれず、この変更では導入していません。

## 認証情報の選択

`backend/src/lib/aws.js` は環境ごとに次のように設定します。

| 実行環境 | Endpoint | 認証情報 |
|---|---|---|
| ローカル開発・テスト（`NODE_ENV` が `production` 以外） | 既定で `https://127.0.0.1:9297`。`AWS_ENDPOINT_URL` で上書き可能 | Emulator credentials file、またはローカルテスト用 `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` |
| AWS 本番（`NODE_ENV=production`） | 既定 endpoint なし。通常 AWS endpoint を使用 | AWS SDK default credential provider chain。ECS task role、EC2 instance profile、Lambda execution role 等を利用 |

本番では `AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`、`AWS_SHARED_CREDENTIALS_FILE` を設定せず、実行環境の IAM ロールに権限を付与してください。SDK の credential chain により一時認証情報の更新も SDK が処理します。AWS 側で `AWS_ENDPOINT_URL` を設定する場合も、ローカル Emulator 以外では静的認証情報をコードから指定しません。

ローカル開発では従来どおり Emulator credentials を利用できます。これらのローカル用 credentials と自己署名証明書を AWS 環境に持ち込まないでください。

## IAM ロールの作成

[`ops/aws-backend-runtime-role.yaml`](../ops/aws-backend-runtime-role.yaml) は Backend 用の CloudFormation runtime role 例です。DynamoDB のアプリ用テーブル、S3 の対象 bucket object、SQS queue のみを許可します。デプロイ先に合わせて AssumeRole の service principal を調整し、作成した role を ECS task role / EC2 instance profile / Lambda execution role として Backend に関連付けてください。コンテナイメージ取得やログ出力などの実行基盤に必要な権限は、この runtime policy ではなく、必要に応じて platform execution role に設定してください。

この role は本番 AWS アカウントで作成・割当するための例です。AWS Emulator が IAM role の割当／認証を完全に再現するものではないため、ローカルでは Emulator credentials を継続使用します。

## Cognito 認証を導入する場合

Cognito User Pool を作成し、既存ユーザーの移行、Frontend の sign-in / sign-up、Backend の JWT 検証、`/api/auth/me` と全保護 API の user ID mapping、E2E の Cognito モックまたは専用 test pool を一体で設計する必要があります。User Pool の issuer URL / client ID が未設定の状態で既存の email/password 認証を切り替えるとログイン不能になるため、これは IAM runtime role の変更とは分けた移行作業にします。
