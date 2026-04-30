// Cloudflare Pages Function: /health 를 fly.io 백엔드로 프록시
const BACKEND = 'https://solarflow-backend.fly.dev'

export async function onRequest({ request }) {
  return fetch(new Request(BACKEND + '/health', request))
}
