import fs from 'node:fs/promises';

export async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function rotateBackupsAndReplace({ dataPath, temporaryPath, backupPath, backupCount }) {
  for (let index = backupCount; index >= 2; index -= 1) {
    if (await fileExists(backupPath(index - 1))) await fs.copyFile(backupPath(index - 1), backupPath(index));
  }
  if (await fileExists(dataPath)) await fs.copyFile(dataPath, backupPath(1));

  try {
    if (await fileExists(dataPath)) await fs.unlink(dataPath);
    await fs.rename(temporaryPath, dataPath);
  } catch (error) {
    if (!await fileExists(dataPath) && await fileExists(backupPath(1))) {
      await fs.copyFile(backupPath(1), dataPath);
    }
    throw error;
  } finally {
    if (await fileExists(temporaryPath)) await fs.rm(temporaryPath, { force: true });
  }
}

export async function readFirstValidFile(candidates, decode) {
  const failures = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const file = candidates[index];
    if (!await fileExists(file)) continue;
    try {
      return { value: decode(await fs.readFile(file, 'utf8')), index, file, failures };
    } catch (error) {
      failures.push({ file, reason: error.message });
    }
  }
  return { value: null, index: -1, file: null, failures };
}
