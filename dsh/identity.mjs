// Shared, dependency-free identity rules for the host plugin and read-only CLI.
// This validates only this plugin's grant payload; YAML parsing stays official.
import { createHash } from 'node:crypto';

export const name = 'dafeiyu-installation';
export const DEFAULT_SERVICE_URL = 'https://livecompanion.duckdns.org/dafeiyu';
const KEY = /^[0-9a-f]{64}$/;
const ID = /^DFY-[0-9a-f]{32}$/;
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
const FIELDS = new Set(['version', 'serviceUrl', 'installationKey', 'userId', 'idEnabled', 'createdAt', 'lastEnrolledAt', 'nextEnrollmentAt']);

export function failure(code, retryAfterSeconds = 0) {
  const error = new Error(`dafeiyu: ${code}${retryAfterSeconds ? `; retry after ${retryAfterSeconds}s` : ''}`);
  error.name = 'DafeiyuInstallationError';
  error.code = code;
  error.retryAfterSeconds = retryAfterSeconds;
  return error;
}

export function serviceAddress(value, allowLoopbackHttp = false) {
  let url;
  try { url = new URL(value); } catch { throw failure('invalid_service_url'); }
  if (typeof value !== 'string' || value.length > 2048 || url.username || url.password || url.search || url.hash
      || (url.protocol !== 'https:' && !(allowLoopbackHttp === true && url.protocol === 'http:' && LOOPBACK.has(url.hostname)))) throw failure('https_service_required');
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.href.replace(/\/$/, '');
}

export function recordKeyFor(serviceUrl) {
  // Same JS key value as official credentialKey(scope, id); branding is a TS
  // type-only distinction. Both segments satisfy its documented grammar.
  return `${name}/service-${createHash('sha256').update(serviceUrl).digest('hex').slice(0, 32)}`;
}

export function recordPayload(record, serviceUrl) {
  const p = record?.payload;
  if (record?.kind !== 'grant' || !p || typeof p !== 'object' || Array.isArray(p)
      || Object.keys(p).some(key => !FIELDS.has(key)) || p.version !== 1 || p.serviceUrl !== serviceUrl
      || typeof p.installationKey !== 'string' || !KEY.test(p.installationKey)
      || (p.userId !== undefined && (typeof p.userId !== 'string' || !ID.test(p.userId)))
      || (p.idEnabled !== undefined && typeof p.idEnabled !== 'boolean')
      || ['createdAt', 'lastEnrolledAt', 'nextEnrollmentAt'].some(key => p[key] !== undefined && (!Number.isSafeInteger(p[key]) || p[key] < 0))) throw failure('installation_record_invalid');
  return p;
}

export function installationStatus(record, serviceUrl) {
  if (record === undefined) return { status: 'not_enrolled', serviceUrl, userId: null, idEnabled: null };
  const p = recordPayload(record, serviceUrl);
  return { status: p.userId ? 'enrolled' : 'pending', serviceUrl, userId: p.userId || null, idEnabled: p.idEnabled ?? null };
}
