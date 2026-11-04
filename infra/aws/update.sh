#!/bin/bash
# Ships the latest code on the stack's branch to the running server: pulls, builds,
# restarts (migrations run on start). Run in AWS CloudShell after pushing to GitHub.
#   bash infra/aws/update.sh
set -euo pipefail

STACK=${STACK:-nium-records}
REGION=${AWS_REGION:-$(aws configure get region)}

INSTANCE=$(aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='InstanceId'].OutputValue" --output text)

CMD=$(aws ssm send-command --region "$REGION" --instance-ids "$INSTANCE" \
  --document-name AWS-RunShellScript \
  --comment "NIUM records update" \
  --parameters 'commands=["sudo -u nium /opt/nium/deploy.sh","systemctl restart nium","sleep 5","systemctl is-active nium"]' \
  --timeout-seconds 900 \
  --query Command.CommandId --output text)

echo "Updating $INSTANCE (command $CMD)…"
aws ssm wait command-executed --region "$REGION" --command-id "$CMD" --instance-id "$INSTANCE" || true
aws ssm get-command-invocation --region "$REGION" --command-id "$CMD" --instance-id "$INSTANCE" \
  --query '[Status, StandardOutputContent, StandardErrorContent]' --output text | tail -30
