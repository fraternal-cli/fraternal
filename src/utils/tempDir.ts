import os from 'os';
import path from 'path';

export const tempDir = (): string => path.join(os.tmpdir(), 'fraternal_temp');
