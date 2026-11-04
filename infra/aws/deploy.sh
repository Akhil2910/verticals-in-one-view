#!/bin/bash
# Creates or updates the AWS stack. Run it in AWS CloudShell (or anywhere with the AWS CLI v2):
#   git clone https://github.com/Akhil2910/verticals-in-one-view.git && cd verticals-in-one-view
#   bash infra/aws/deploy.sh                      # uses CloudShell's region
#   bash infra/aws/deploy.sh Branch=aws-release   # extra stack parameters, Key=Value
set -euo pipefail

STACK=${STACK:-nium-records}
REGION=${AWS_REGION:-$(aws configure get region)}
HERE=$(cd "$(dirname "$0")" && pwd)

PREFIX_LIST=$(aws ec2 describe-managed-prefix-lists --region "$REGION" \
  --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing \
  --query 'PrefixLists[0].PrefixListId' --output text)

echo "Deploying stack '$STACK' to $REGION. The first run takes about 20-25 minutes (database + build)."
aws cloudformation deploy \
  --region "$REGION" \
  --stack-name "$STACK" \
  --template-file "$HERE/nium-stack.yaml" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides CloudFrontPrefixListId="$PREFIX_LIST" "$@"

aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[].[OutputKey,OutputValue]' --output table
