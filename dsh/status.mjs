#!/usr/bin/env node
// Explicit user command, never a model tool. The official provider's parser is
// pure; instantiating its service could migrate an old file and is avoided.
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_SERVICE_URL, installationStatus, recordKeyFor, serviceAddress } from './identity.mjs';

async function officialParser() {
  try { return (await import('@deepseek-ai/dsh-credentials-local')).parseCredentialsDocument; }
  catch {
    // Official Desktop CLI supplies this executable to pnpm and its node.cmd
    // launcher. A local linked checkout does not have its own node_modules.
    // Reuse the parser shipped with that host; never copy or reimplement YAML.
    const executable = process.env.DSH_DESKTOP_NODE_EXECUTABLE;
    if (!executable) throw new Error('official_credential_parser_unavailable');
    const entry = join(dirname(executable), 'resources', 'app.asar', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-credentials-local', 'lib', 'index.js');
    try {
      const parser = (await import(pathToFileURL(entry).href)).parseCredentialsDocument;
      if (typeof parser !== 'function') throw new Error();
      return parser;
    } catch { throw new Error('official_credential_parser_unavailable'); }
  }
}

async function main() {
  const args = process.argv.slice(2);
  let target = process.env.DAFEIYU_SERVICE_URL || DEFAULT_SERVICE_URL;
  let filename = join(process.env.DSH_HOME || join(homedir(), '.dsh'), '.credentials.yaml');
  let allowLoopbackHttp = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--service-url' && args[i + 1]) target = args[++i];
    else if (args[i] === '--credentials-file' && args[i + 1]) filename = args[++i];
    else if (args[i] === '--allow-loopback-http') allowLoopbackHttp = true;
    else throw new Error('invalid_arguments');
  }
  const serviceUrl = serviceAddress(target, allowLoopbackHttp);
  let text;
  try { text = await readFile(filename, 'utf8'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw new Error('private_storage_unavailable');
    console.log(JSON.stringify(installationStatus(undefined, serviceUrl)));
    return;
  }
  const parseCredentialsDocument = await officialParser();
  let document;
  try { document = parseCredentialsDocument(text, filename); }
  catch { throw new Error('private_storage_invalid'); }
  console.log(JSON.stringify(installationStatus(document.records.get(recordKeyFor(serviceUrl)), serviceUrl)));
}

try { await main(); }
catch (error) {
  const allowed = new Set(['invalid_arguments', 'private_storage_unavailable', 'private_storage_invalid', 'official_credential_parser_unavailable']);
  const code = allowed.has(error.message) ? error.message : ['invalid_service_url', 'https_service_required', 'installation_record_invalid'].includes(error.code) ? error.code : 'status_unavailable';
  console.error(JSON.stringify({ success: false, error: code }));
  process.exitCode = 1;
}
