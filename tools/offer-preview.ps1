# Local simulation only. Start mr-ez-dev-server.mjs --trial separately on 8879,
# with MR_EZ_SITE_ORIGIN=http://127.0.0.1:4479. No production secrets are read.
$env:PUBLIC_ACCESS_MODE='trial'
$env:PUBLIC_SUPABASE_URL='http://127.0.0.1:8879'
$env:PUBLIC_SUPABASE_ANON_KEY='local-anon-key'
$env:PUBLIC_CONTENT_URL='http://127.0.0.1:8879/content'
$env:PUBLIC_MR_EZ_URL='http://127.0.0.1:8879/tutor'
$env:PUBLIC_GRADER_URL='http://127.0.0.1:8879/grade-essay'
$env:PUBLIC_SPEAKING_GRADER_URL='http://127.0.0.1:8879/grade-speaking'
$env:PUBLIC_LIVE_EXAMINER_URL='http://127.0.0.1:8879/live'
$env:PUBLIC_PAYMENTS_URL='http://127.0.0.1:8879/payments'
$env:PUBLIC_PAYMENTS_SIMULATED='1'
npm run build *> offer-review-build.log
if ($LASTEXITCODE -ne 0) { Get-Content offer-review-build.log -Tail 35; exit $LASTEXITCODE }
node --import ./tests/ts-extension-loader.mjs tools/trial-content-audit.mjs dist *> offer-leak-audit.log
if ($LASTEXITCODE -ne 0) { Get-Content offer-leak-audit.log -Tail 35; exit $LASTEXITCODE }
npm run preview -- --host 127.0.0.1 --port 4479
