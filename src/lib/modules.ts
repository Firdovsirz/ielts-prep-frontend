/** CSS class carrying a module's accent colour (--m). */
export function moduleClass(module: string): string {
  return `m-${module.toLowerCase()}`;
}
