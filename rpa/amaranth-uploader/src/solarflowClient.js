import fs from 'node:fs';
import path from 'node:path';

export class SolarFlowClient {
  constructor(config) {
    this.config = config;
  }

  async listPendingJobs() {
    return this.requestJSON('/export/amaranth/jobs?job_type=outbound&status=pending');
  }

  async claimJob(jobID) {
    const result = await this.requestJSON(`/export/amaranth/jobs/${encodeURIComponent(jobID)}/claim`, {
      method: 'POST',
    });
    return result.job;
  }

  async updateJobStatus(jobID, status, payload = {}) {
    return this.requestJSON(`/export/amaranth/jobs/${encodeURIComponent(jobID)}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status,
        upload_message: payload.uploadMessage,
        last_error: payload.lastError,
      }),
    });
  }

  async downloadJobFile(job) {
    fs.mkdirSync(this.config.downloadDir, { recursive: true });

    const response = await this.request(`/export/amaranth/jobs/${encodeURIComponent(job.job_id)}/download`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const fileName = safeFileName(readDispositionFileName(response) || job.file_name || `${job.job_id}.xlsx`);
    const filePath = path.join(this.config.downloadDir, `${job.job_id}_${fileName}`);

    fs.writeFileSync(filePath, buffer, { mode: 0o640 });
    return filePath;
  }

  async requestJSON(apiPath, options = {}) {
    const response = await this.request(apiPath, options);
    if (response.status === 204) return undefined;

    const text = await response.text();
    if (!text.trim()) return undefined;

    try {
      return JSON.parse(text);
    } catch (err) {
      throw new Error(`SolarFlow JSON 응답을 읽을 수 없습니다: ${err.message}`);
    }
  }

  async request(apiPath, options = {}) {
    const headers = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    };
    if (this.config.rpaToken) {
      headers['X-SolarFlow-RPA-Token'] = this.config.rpaToken;
    } else {
      headers.Authorization = `Bearer ${this.config.accessToken}`;
    }

    const response = await fetch(`${this.config.apiURL}${apiPath}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new Error(`SolarFlow API 실패 (${response.status}): ${message}`);
    }
    return response;
  }
}

function readDispositionFileName(response) {
  const header = response.headers.get('content-disposition') || '';
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) return decodeURIComponent(utf8Match[1]);

  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  if (plainMatch) return plainMatch[1];
  return '';
}

function safeFileName(value) {
  return value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').slice(0, 160);
}

async function readErrorMessage(response) {
  const text = await response.text().catch(() => '');
  if (!text.trim()) return response.statusText || '요청 실패';

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.message === 'string') return parsed.message;
  } catch {
    return text.slice(0, 300);
  }
  return text.slice(0, 300);
}
