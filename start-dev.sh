#!/bin/bash
# Simple wrapper to start Next.js dev server without tee
cd "$(dirname "$0")"
npx next dev -p 3000
