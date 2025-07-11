import type { ExtractCLIOptions } from '@formatjs/cli-lib';

export interface FormatJSPluginOptions extends ExtractCLIOptions {
  include?: string[];
  debug: boolean;
  hotReload: boolean;
  incremental: boolean;
  extractOnBuild: boolean;
}
