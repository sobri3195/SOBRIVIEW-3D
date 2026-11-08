#!/usr/bin/env bash
set -euo pipefail
cd /workspace/SOBRIVIEW-3D
npm --cache /workspace/.npm ci --no-audit --no-fund
