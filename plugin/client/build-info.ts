/**
 * Build identity shown in the panel's debug line.
 *
 * The values are injected by scripts/build-client.mjs through esbuild `define`
 * (`__FITPLATE_BUILD__`) and describe the actual bytes that were built: the
 * package version from plugin/package.json when present (otherwise the root
 * version), a digest over the client sources, and the bundler/library versions.
 * Nothing here is invented at runtime — an unbuilt/dev import falls back to an
 * explicit "dev-unbuilt" marker instead of a plausible-looking hash.
 */

export interface BuildInfo {
  name: string
  version: string
  /** Digest over the client sources the bundle was produced from. */
  buildHash: string
  /** Build time is recorded in build-manifest.json, not embedded (reproducible bytes). */
  builtAt?: string
  builtWith: Record<string, string>
  externals: string[]
  buildHashAlgorithm: string
}

declare const __FITPLATE_BUILD__: BuildInfo | undefined

export const BUILD_INFO: BuildInfo =
  typeof __FITPLATE_BUILD__ !== 'undefined' && __FITPLATE_BUILD__ !== null
    ? __FITPLATE_BUILD__
    : {
        name: '@fitplate/plugin-client',
        version: '0.0.0-dev',
        buildHash: 'dev-unbuilt',
        builtWith: {},
        externals: [],
        buildHashAlgorithm: 'sha256',
      }

export function describeBuild(): string {
  const bundler = BUILD_INFO.builtWith.esbuild ? ` · esbuild ${BUILD_INFO.builtWith.esbuild}` : ''
  const three = BUILD_INFO.builtWith.three ? ` · three ${BUILD_INFO.builtWith.three}` : ''
  return `插件版本 ${BUILD_INFO.version} · 构建哈希 ${BUILD_INFO.buildHash.slice(0, 12)}${bundler}${three}`
}
