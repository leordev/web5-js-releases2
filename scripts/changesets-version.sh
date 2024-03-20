#!/bin/bash

IGNORE_API_RELEASE=""

# force api release if argument is passed
FORCE_API_RELEASE=$1

# check if api release is forced or if there 
# is a changeset PR with the api-release label
API_RELEASE_PR=$FORCE_API_RELEASE || $(gh pr list \
                --base 'main' \
                --head 'changeset-release/main' \
                --json title,labels,number \
                --jq '[.[] | select(.labels[]?.name == "api-release")] | first | .number')

# if there is no PR, then we release without the Web5 API
if [[ -z "$API_RELEASE_PR" ]]; then
    echo "This is a release without the Web5 API"
    IGNORE_API_RELEASE="--ignore @leordev-web5/api"
else
    echo "Web5 API Release DETECTED"
fi

pnpm changeset version $IGNORE_API_RELEASE

# update pnpm-lock.yaml
pnpm install --no-frozen-lockfile