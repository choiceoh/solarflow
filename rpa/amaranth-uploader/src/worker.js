import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { ensureRuntimeDirs, loadConfig } from './config.js';
import { openLoginBrowser, uploadOutboundExcel } from './amaranthBrowser.js';
import { SolarFlowClient } from './solarflowClient.js';

const command = process.argv[2] || 'once';

try {
  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  const config = loadConfig(command);
  ensureRuntimeDirs(config);

  if (command === 'login') {
    await runLogin(config);
  } else if (command === 'once') {
    await runOnce(config);
  } else if (command === 'watch') {
    await runWatch(config);
  } else {
    printHelp();
    process.exitCode = 1;
  }
} catch (err) {
  console.error(`[아마란스 RPA] 중단: ${err.message}`);
  process.exitCode = 1;
}

async function runLogin(config) {
  const { context } = await openLoginBrowser(config);
  console.log('[아마란스 RPA] 브라우저를 열었습니다. 로그인 후 출고등록엑셀업로드 화면이 보이면 Enter를 누르세요.');

  const rl = readline.createInterface({ input, output });
  await rl.question('');
  rl.close();

  await context.close();
  console.log('[아마란스 RPA] 로그인 세션 저장을 마쳤습니다.');
}

async function runOnce(config) {
  const client = new SolarFlowClient(config);
  const pendingJobs = await client.listPendingJobs();

  if (!Array.isArray(pendingJobs) || pendingJobs.length === 0) {
    console.log('[아마란스 RPA] 대기 중인 출고 업로드 작업이 없습니다.');
    return;
  }

  const targets = pendingJobs.slice(0, config.maxJobsPerRun);
  for (const job of targets) {
    await processJob(client, config, job);
  }
}

async function runWatch(config) {
  let stopped = false;
  process.on('SIGINT', () => {
    stopped = true;
    console.log('\n[아마란스 RPA] 종료 요청을 받았습니다. 현재 주기 후 멈춥니다.');
  });

  console.log(`[아마란스 RPA] 감시를 시작합니다. 주기: ${config.pollIntervalMs}ms`);
  while (!stopped) {
    await runOnce(config).catch((err) => {
      console.error(`[아마란스 RPA] 감시 주기 실패: ${err.message}`);
    });
    if (!stopped) {
      await sleep(config.pollIntervalMs);
    }
  }
}

async function processJob(client, config, pendingJob) {
  console.log(`[아마란스 RPA] 작업 선점 시도: ${pendingJob.job_id}`);

  let job;
  try {
    job = await client.claimJob(pendingJob.job_id);
  } catch (err) {
    console.warn(`[아마란스 RPA] 작업 선점 건너뜀: ${err.message}`);
    return;
  }

  try {
    const filePath = await client.downloadJobFile(job);
    console.log(`[아마란스 RPA] 엑셀 다운로드 완료: ${filePath}`);

    const result = await uploadOutboundExcel(config, job, filePath);
    if (result.status === 'uploaded') {
      await client.updateJobStatus(job.job_id, 'uploaded', {
        uploadMessage: result.message,
      });
      console.log(`[아마란스 RPA] 업로드 완료: ${job.job_id}`);
      return;
    }

    await client.updateJobStatus(job.job_id, 'manual_required', {
      uploadMessage: result.message,
      lastError: formatResult(result),
    });
    console.warn(`[아마란스 RPA] 수동 확인 필요: ${job.job_id}`);
  } catch (err) {
    const status = err.status || 'failed';
    await client.updateJobStatus(job.job_id, status, {
      lastError: formatError(err),
    }).catch((updateErr) => {
      console.error(`[아마란스 RPA] 실패 상태 저장도 실패했습니다: ${updateErr.message}`);
    });
    console.error(`[아마란스 RPA] 작업 실패: ${job.job_id} (${err.code || 'ERROR'}) ${err.message}`);
  }
}

function formatResult(result) {
  return [
    'RESULT_UNCONFIRMED',
    result.message,
    result.artifactPath ? `screenshot=${result.artifactPath}` : '',
  ].filter(Boolean).join(' | ');
}

function formatError(err) {
  return [
    err.code || 'ERROR',
    err.message,
    err.artifactPath ? `screenshot=${err.artifactPath}` : '',
  ].filter(Boolean).join(' | ');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printHelp() {
  console.log(`
사용법:
  npm run login  # 아마란스 로그인 세션 저장
  npm run once   # pending 작업 1회 처리
  npm run watch  # pending 작업 계속 감시
`);
}
