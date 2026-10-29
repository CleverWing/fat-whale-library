import { randomBytes } from 'node:crypto';
import z from '@deepseek-ai/schemastery';
import * as McpClient from '@deepseek-ai/dsh-mcp-client';
import { name, DEFAULT_SERVICE_URL, failure, serviceAddress, recordKeyFor, recordPayload, installationStatus } from './identity.mjs';

export { name, DEFAULT_SERVICE_URL, serviceAddress, recordKeyFor, installationStatus };
export const inject = ['credentials', 'tools'];
export const Config = z.object({
  serviceUrl: z.string().default(DEFAULT_SERVICE_URL),
  allowLoopbackHttp: z.boolean().default(false),
  enrollmentTimeoutMs: z.number().min(25).max(120000).default(15000),
  toolCallTimeoutMs: z.number().min(25).max(120000).default(30000),
});

const ID = /^DFY-[0-9a-f]{32}$/;
const RESPONSE_FIELDS = new Set(['success', 'userId', 'idEnabled', 'created', 'createdAt', 'lastEnrolledAt']);

async function modify(credentials, key, mutate) {
  try { return await credentials.modifyRecord(key, mutate); }
  catch (error) {
    if (error?.name === 'DafeiyuInstallationError') throw error;
    throw failure('private_storage_unavailable');
  }
}

async function ensureInstallation(credentials, key, serviceUrl) {
  // The official provider re-reads under its cross-process writer lock. A key
  // exists durably before any HTTP request; an invalid existing record is never
  // replaced. Network I/O deliberately happens after the lock has been released.
  const record = await modify(credentials, key, current => {
    if (current !== undefined) { recordPayload(current, serviceUrl); return undefined; }
    return { kind: 'grant', payload: { version: 1, serviceUrl, installationKey: randomBytes(32).toString('hex') } };
  });
  return recordPayload(record, serviceUrl);
}

async function updateInstallation(credentials, key, serviceUrl, expectedKey, changes) {
  const record = await modify(credentials, key, current => {
    const p = recordPayload(current, serviceUrl);
    if (p.installationKey !== expectedKey || (p.userId && changes.userId && p.userId !== changes.userId)) throw failure('installation_identity_mismatch');
    const next = { ...p, ...changes };
    // A concurrent successful request must not erase a later 429's cooldown.
    if ((p.nextEnrollmentAt || 0) > Date.now()) next.nextEnrollmentAt = Math.max(p.nextEnrollmentAt, changes.nextEnrollmentAt || 0);
    return { kind: 'grant', payload: next };
  });
  return recordPayload(record, serviceUrl);
}

function retrySeconds(response) {
  const raw = response.headers.get('Retry-After') || '';
  const seconds = /^\d+$/.test(raw) ? Number(raw) : Math.ceil((Date.parse(raw) - Date.now()) / 1000);
  return Number.isFinite(seconds) ? Math.max(1, Math.min(604800, Math.ceil(seconds))) : 60;
}

async function boundedJson(response, maximum = 32768) {
  if (!response.body) throw failure('invalid_service_response');
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > maximum) { await reader.cancel(); throw failure('invalid_service_response'); }
      chunks.push(part.value);
    }
    const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw failure('invalid_service_response');
    return payload;
  } catch { throw failure('invalid_service_response'); }
  finally { reader.releaseLock(); }
}

async function serviceRequest(url, init, signal, timeoutMs) {
  let response;
  try {
    response = await fetch(url, { ...init, redirect: 'error', cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) });
  } catch {
    throw failure(signal.aborted ? 'disposed' : 'service_connection_failed');
  }
  if (!response.ok) {
    // Do not parse or propagate arbitrary error bodies. Status alone controls
    // policy, and redirect:'error' prevents a key being forwarded elsewhere.
    await response.body?.cancel().catch(() => {});
    if (response.status === 429) throw failure('rate_limited', retrySeconds(response));
    if (response.status === 403) throw failure('installation_disabled');
    if (response.status === 401) throw failure('installation_not_authorized');
    throw failure('service_request_failed');
  }
  return boundedJson(response);
}

function enrollmentResponse(value) {
  if (Object.keys(value).length !== RESPONSE_FIELDS.size || Object.keys(value).some(key => !RESPONSE_FIELDS.has(key))
      || value.success !== true || value.idEnabled !== true || typeof value.userId !== 'string' || !ID.test(value.userId)
      || typeof value.created !== 'boolean' || !Number.isSafeInteger(value.createdAt) || value.createdAt < 0
      || !Number.isSafeInteger(value.lastEnrolledAt) || value.lastEnrolledAt < value.createdAt) {
    throw failure('invalid_service_response');
  }
  return value;
}

function publicUsage(value, userId) {
  if (value.success !== true || value.userId !== userId || !value.usage || typeof value.usage !== 'object') throw failure('invalid_service_response');
  const source = value.usage;
  const usage = {};
  const integer = number => Number.isSafeInteger(number) && number >= 0;
  for (const key of ['windowSeconds', 'limit', 'admittedLastMinute', 'deniedLastMinute', 'remaining', 'retryAfterSeconds']) {
    if (!integer(source[key])) throw failure('invalid_service_response');
    usage[key] = source[key];
  }
  usage.totalsLast24Hours = {};
  for (const key of ['requests', 'successes', 'rateLimited', 'failed', 'distinctIps']) {
    if (!integer(source.totalsLast24Hours?.[key])) throw failure('invalid_service_response');
    usage.totalsLast24Hours[key] = source.totalsLast24Hours[key];
  }
  if (!Array.isArray(source.signals) || !Array.isArray(source.recentRequests)) throw failure('invalid_service_response');
  const codes = new Set(['rate_limit_rejections', 'failed_requests', 'multiple_source_ips']);
  usage.signals = source.signals.map(item => {
    if (!item || !codes.has(item.code) || !integer(item.count)) throw failure('invalid_service_response');
    return { code: item.code, count: item.count };
  });
  usage.recentRequests = source.recentRequests.slice(0, 20).map(item => {
    if (!item || typeof item.requestedAt !== 'number' || !Number.isFinite(item.requestedAt) || item.requestedAt < 0
        || !integer(item.status) || item.status > 599 || typeof item.admitted !== 'boolean'
        || !['', 'id', 'ip', 'ip,id'].includes(item.quotaReason)) throw failure('invalid_service_response');
    return { requestedAt: item.requestedAt, status: item.status, admitted: item.admitted, quotaReason: item.quotaReason };
  });
  return { maskedId: `DFY-…${userId.slice(-8)}`, usage };
}

export async function apply(ctx, config) {
  const serviceUrl = serviceAddress(config.serviceUrl, config.allowLoopbackHttp);
  const key = recordKeyFor(serviceUrl);
  const controller = new AbortController();
  // Cordis may dispose a fiber while its async activation is still pending.
  // Observe the same early lifecycle seam as the official MCP client rather
  // than waiting for activation to settle before running effect cleanup.
  ctx.on('internal/plugin', fiber => {
    if (fiber === ctx.fiber && fiber.uid === null) controller.abort();
  }, { global: true });
  ctx.effect(() => () => controller.abort(), 'dafeiyu-installation.requests');
  const p = await ensureInstallation(ctx.credentials, key, serviceUrl);
  if (controller.signal.aborted) throw failure('disposed');
  const wait = Math.ceil(((p.nextEnrollmentAt || 0) - Date.now()) / 1000);
  if (wait > 0) throw failure('rate_limited', wait);
  let enrolled;
  try {
    enrolled = enrollmentResponse(await serviceRequest(`${serviceUrl}/v1/installations/enroll`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ installation_key: p.installationKey }),
    }, controller.signal, config.enrollmentTimeoutMs));
  } catch (error) {
    if (error.code === 'rate_limited') await updateInstallation(ctx.credentials, key, serviceUrl, p.installationKey,
      { nextEnrollmentAt: Date.now() + error.retryAfterSeconds * 1000 });
    if (error.code === 'installation_disabled') await updateInstallation(ctx.credentials, key, serviceUrl, p.installationKey, { idEnabled: false });
    throw error;
  }
  await updateInstallation(ctx.credentials, key, serviceUrl, p.installationKey, {
    userId: enrolled.userId, idEnabled: true, createdAt: enrolled.createdAt,
    lastEnrolledAt: enrolled.lastEnrolledAt, nextEnrollmentAt: 0,
  });
  if (controller.signal.aborted) throw failure('disposed');
  const mcp = ctx.plugin(McpClient, {
    serverName: 'dafeiyu', transport: 'streamable-http', url: `${serviceUrl}/mcp`,
    headers: { 'X-Dafeiyu-ID': enrolled.userId }, toolCallTimeoutMs: config.toolCallTimeoutMs,
    failOnStartupError: true, reconnect: { enabled: false },
  });
  try { await mcp.await(); }
  catch { throw failure('mcp_connection_failed'); }
  if (controller.signal.aborted) throw failure('disposed');
  ctx.effect(() => ctx.tools.register({
    name: 'dafeiyu_usage',
    isConcurrencySafe: () => true,
    description: '查看本安装的大肥鱼知识库请求频率与提醒。仅返回本人统计和ID尾号；HTTP成功数不代表视频命中，多来源不是滥用判定。',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: { schema: { type: 'object', properties: { maskedId: { type: 'string' }, usage: { type: 'object' } },
      required: ['maskedId', 'usage'], additionalProperties: false },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    async execute(args, execution) {
      if (!args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).length) throw failure('invalid_usage_arguments');
      let stored;
      try { stored = recordPayload(await ctx.credentials.readRecord(key), serviceUrl); }
      catch { throw failure('private_storage_unavailable'); }
      if (stored.userId !== enrolled.userId || stored.idEnabled === false) throw failure('installation_not_authorized');
      return publicUsage(await serviceRequest(`${serviceUrl}/v1/installations/usage`, {
        method: 'GET', headers: { Accept: 'application/json', 'X-Dafeiyu-ID': stored.userId },
      }, execution?.signal ? AbortSignal.any([controller.signal, execution.signal]) : controller.signal, config.enrollmentTimeoutMs), stored.userId);
    },
  }), 'dafeiyu-installation.usage');
}

