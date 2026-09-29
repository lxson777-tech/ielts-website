#!/bin/sh
# Verifier builds: $1 = port of stand-in, $2 = outDir name, $3 = "pay" to include payments
cd "/c/Users/Alex/Desktop/Projects/IELTS website/.claude/worktrees/musing-mcclintock-862665" || exit 1
P=$1
export PUBLIC_ACCESS_MODE=trial PUBLIC_SUPABASE_URL=http://127.0.0.1:$P PUBLIC_SUPABASE_ANON_KEY=local-anon-key  PUBLIC_MR_EZ_URL=http://127.0.0.1:$P/tutor PUBLIC_GRADER_URL=http://127.0.0.1:$P/grade-essay  PUBLIC_CONTENT_URL=http://127.0.0.1:$P/content PUBLIC_LIVE_EXAMINER_URL=http://127.0.0.1:$P/live  PUBLIC_SPEAKING_GRADER_URL=http://127.0.0.1:$P/grade-speaking
if [ "$3" = "pay" ]; then export PUBLIC_PAYMENTS_URL=http://127.0.0.1:$P/payments PUBLIC_PAYMENTS_SIMULATED=1; fi
npx astro build --outDir "C:/Users/Alex/AppData/Local/Temp/claude/C--Users-Alex-Desktop-Projects-IELTS-website--claude-worktrees-musing-mcclintock-862665/7ea06528-23bb-4dbf-be18-8c70267e53bf/scratchpad/verify/$2"
