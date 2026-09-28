import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

/**
 * Tiny JSON file store for generated assets and the publish audit log.
 * Keys map to `<dataDir>/<key>.json`. Missing files read as the fallback.
 */
export function createStore(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = (key) => path.join(dataDir, `${key.replace(/[^a-z0-9_-]/gi, '_')}.json`);

  async function read(key, fallback = null) {
    try {
      return JSON.parse(await fsp.readFile(file(key), 'utf8'));
    } catch {
      return fallback;
    }
  }

  async function write(key, value) {
    await fsp.writeFile(file(key), JSON.stringify(value, null, 2));
    return value;
  }

  return {
    dataDir,
    read,
    write,
    async appendLog(entry) {
      const log = await read('publish-log', []);
      log.push(entry);
      await write('publish-log', log.slice(-500));
      return entry;
    },
    async readPublishLog() {
      return read('publish-log', []);
    },
  };
}

export default createStore;
