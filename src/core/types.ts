import type { CompileOpts, ExtractCLIOptions } from '@formatjs/cli-lib';

export interface FormatJSPluginOptions
  extends Omit<ExtractCLIOptions, 'format' | 'ast'>,
    Omit<CompileOpts, 'format' | 'ast'> {
  extractFormat?: ExtractCLIOptions['format'];
  extractAst?: ExtractCLIOptions['ast'];
  compileFormat?: CompileOpts['format'];
  compileAst?: CompileOpts['ast'];

  include?: string[];
  debug?: boolean;
  hotReload?: boolean;
  extractOnBuild?: boolean;
  compileFolder?: string;
  outFolder?: string;
  compileOnBuild?: boolean;
}
