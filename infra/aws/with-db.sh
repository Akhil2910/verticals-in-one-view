#!/bin/bash
# Runs a command on the AWS app server with DATABASE_URL set from Secrets Manager.
# Used by the systemd service at start-up, and by hand for one-off jobs, e.g.:
#   sudo -iu nium
#   cd app && infra/aws/with-db.sh npm run db:import-supabase
set -euo pipefail
set -a; . /etc/nium.env; set +a

SECRET=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "$DB_SECRET_ARN" --query SecretString --output text)
DATABASE_URL=$(SECRET="$SECRET" node -e '
  const s = JSON.parse(process.env.SECRET), e = encodeURIComponent, env = process.env;
  console.log(`postgres://${e(s.username)}:${e(s.password)}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}?sslmode=require`);')
unset SECRET
export DATABASE_URL

exec "$@"
