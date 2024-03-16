#!/bin/bash

# declare function publish that receives a path and call `pnpm publish --dry-run` from that path
function publish {
    echo "Publishing $1..."
    cd packages/$1
    pnpm publish $1 --dry-run 
    cd ../..
}

publish common
publish crypto
publish crypto-aws-kms
publish dids
publish credentials
publish agent
publish user-agent
publish proxy-agent
publish api
publish identity-agent