import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');
const USER_STATE_PATH = path.join(DATA_DIR, 'user-state.json');
const PR_CACHE_PATH = path.join(DATA_DIR, 'pr-cache.json');

// Whitelabel: Clean default tags (fully managed by the user)
export const DEFAULT_TAGS = [];

const DEFAULT_USER_STATE = {
  version: 1,
  customTags: DEFAULT_TAGS,
  prs: {},
};

let writeQueue = Promise.resolve();

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function atomicWriteJson(filePath, data) {
  await ensureDataDir();
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

function enqueueWrite(task) {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => {});
  return next;
}

export async function readUserState() {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(USER_STATE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version ?? 1,
      customTags: Array.isArray(parsed.customTags) ? parsed.customTags : DEFAULT_TAGS,
      prs: parsed.prs && typeof parsed.prs === 'object' ? parsed.prs : {},
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      const initial = structuredClone(DEFAULT_USER_STATE);
      await atomicWriteJson(USER_STATE_PATH, initial);
      return initial;
    }
    throw err;
  }
}

export async function writeUserState(state) {
  return enqueueWrite(() => atomicWriteJson(USER_STATE_PATH, state));
}

export async function updateUserState(mutator) {
  return enqueueWrite(async () => {
    const current = await readUserState();
    const updated = await mutator(current);
    const finalState = updated || current;
    await atomicWriteJson(USER_STATE_PATH, finalState);
    return finalState;
  });
}

export async function readPrCache() {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(PR_CACHE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

export async function writePrCache(cache) {
  return enqueueWrite(() => atomicWriteJson(PR_CACHE_PATH, cache));
}
