import http from 'k6/http';
import { check, sleep } from 'k6';

const vus = Number(__ENV.K6_VUS || 2);
const duration = __ENV.K6_DURATION || '5s';

export const options = {
  vus,
  duration,
  thresholds: {
    http_req_failed: ['rate<0.2'],
    http_req_duration: ['p(95)<1500']
  }
};

const target = __ENV.PERF_TARGET_URL || 'https://test.k6.io';

export default function () {
  const res = http.get(target);
  check(res, {
    'status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
    'body has content': (r) => (r.body || '').length > 0
  });
  sleep(1);
}
