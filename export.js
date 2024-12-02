import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as toast from './toast.js';

const POS_SYSTEMS = {
  toast,
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readCredentials() {
  try {
    const credsPath = path.join(__dirname, 'creds.json');
    const fileContent = await fs.readFile(credsPath, 'utf-8');
    const credentials = JSON.parse(fileContent);

    if (!Array.isArray(credentials)) {
      throw new Error('Credentials must be an array');
    }

    for (const creds of credentials) {
      if (!creds.username || !creds.password) {
        throw new Error('Each credential must have username and password');
      }
    }

    return credentials;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Credentials file not found');
    }
    throw error;
  }
}

async function exportReport(creds) {
  const { pos, username, password } = creds;
  const posSystem = POS_SYSTEMS[pos];

  const { page, browser } = await posSystem.login(username, password);
  await posSystem.buildReport(page);
  await posSystem.downloadReport(page);

  await browser.close();
}

async function main() {
  try {
    const credentials = await readCredentials();
    for (const creds of credentials) {
      await exportReport(creds)
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
