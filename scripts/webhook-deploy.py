#!/usr/bin/env python3
"""
GitHub webhook receiver — main 브랜치 push 시 cron-deploy.sh 즉시 실행.

상시 실행: solarflow-webhook.service (systemd user 유닛).
외부 노출: cloudflared 터널의 api.topworks.ltd/__webhook/deploy → localhost:9999.
보안: GitHub webhook secret으로 HMAC-SHA256 서명 검증 (X-Hub-Signature-256 헤더).

cron-deploy 백업으로 매 10분 cron은 그대로 유지 — webhook이 빠지거나 push event를
놓쳐도 늦어도 10분 안에는 동기화됨.
"""
import hashlib
import hmac
import json
import os
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread

SECRET = os.environ.get('WEBHOOK_SECRET', '').encode()
SCRIPT = os.environ.get(
    'DEPLOY_SCRIPT',
    '/home/choiceoh/공개/solarflow-3/scripts/cron-deploy.sh',
)
PORT = int(os.environ.get('WEBHOOK_PORT', '9999'))


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write(f"{self.address_string()} {fmt % args}\n")

    def do_POST(self):
        # cloudflared가 /__webhook/deploy로 라우팅. 본문/서명 검증 후 푸시 이벤트만 처리.
        n = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(n)

        sig = self.headers.get('X-Hub-Signature-256', '')
        if not self._verify(body, sig):
            return self._respond(401, 'invalid signature')

        event = self.headers.get('X-GitHub-Event', '')
        if event == 'ping':
            return self._respond(200, 'pong')
        if event != 'push':
            return self._respond(200, f'ignored event: {event}')

        try:
            payload = json.loads(body)
        except Exception:
            return self._respond(400, 'invalid json')

        ref = payload.get('ref', '')
        if ref != 'refs/heads/main':
            return self._respond(200, f'ignored ref: {ref}')

        # cron-deploy는 git pull → 변경 컴포넌트만 빌드/재시작 — 최대 ~분 단위 소요.
        # GitHub webhook은 10초 타임아웃이라 detached 실행하고 즉시 200 반환.
        commit = (payload.get('after') or '')[:8]
        sys.stderr.write(f"trigger deploy commit={commit} ref={ref}\n")
        Thread(
            target=lambda: subprocess.run([SCRIPT], check=False),
            daemon=True,
        ).start()
        return self._respond(202, f'triggered {commit}')

    def do_GET(self):
        # 헬스체크 — 외부에서 호출용 아니라 운영자 디버깅용.
        return self._respond(200, 'webhook listener up')

    def _verify(self, body: bytes, sig: str) -> bool:
        if not SECRET or not sig.startswith('sha256='):
            return False
        mac = hmac.new(SECRET, body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(mac, sig.removeprefix('sha256='))

    def _respond(self, code: int, msg: str):
        self.send_response(code)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.end_headers()
        self.wfile.write(msg.encode() + b'\n')


if __name__ == '__main__':
    if not SECRET:
        sys.stderr.write('WEBHOOK_SECRET 미설정\n')
        sys.exit(1)
    sys.stderr.write(f'webhook listener 시작: 127.0.0.1:{PORT}\n')
    HTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
