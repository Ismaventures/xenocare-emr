import { execSync } from 'child_process';
import fs from 'fs';
import webpackPaths from '../configs/webpack.paths.js';

const appPackageJson = JSON.parse(
  fs.readFileSync(new URL('../../release/app/package.json', import.meta.url), 'utf8'),
);
const { dependencies } = appPackageJson;

if (
  Object.keys(dependencies || {}).length > 0 &&
  fs.existsSync(webpackPaths.appNodeModulesPath)
) {
  const electronRebuildCmd =
    '../../node_modules/.bin/electron-rebuild --force --types prod,dev,optional --module-dir .';
  const cmd =
    process.platform === 'win32'
      ? electronRebuildCmd.replace(/\//g, '\\')
      : electronRebuildCmd;
  execSync(cmd, {
    cwd: webpackPaths.appPath,
    stdio: 'inherit',
  });
}
