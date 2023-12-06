import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export function isAngularWorkspace() {
  return existsSync(join(process.cwd(), 'angular.json'));
}

export function getAngularVersion() {
  const packageJsonPath = join(process.cwd(), 'package.json');
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const angularCoreVersion: string =
      packageJson.dependencies['@angular/core'];
    return angularCoreVersion
      ? +angularCoreVersion.replace(/[^0-9.]/g, '').slice(0, 2)
      : 0;
  }
  return 0;
}
