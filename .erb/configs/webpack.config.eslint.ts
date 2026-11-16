/* eslint import/no-unresolved: off, import/no-self-import: off */

import { createRequire } from 'module';

const _require = createRequire(import.meta.url);
export default _require('./webpack.config.renderer.dev').default;
