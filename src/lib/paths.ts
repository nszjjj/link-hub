export function isRelativeAssetPath(value: string): boolean {
  if (/[\\%?#\u0000-\u001f\u007f]/.test(value)) return false
  return value.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
}

export function isLocalAssetPath(value: string, directory: 'files' | 'icons'): boolean {
  return value.startsWith(`${directory}/`) && isRelativeAssetPath(value)
}

export function assetUrl(relative: string): string {
  if (!isRelativeAssetPath(relative)) throw new Error(`无效静态资源路径：${relative}`)
  return `${import.meta.env.BASE_URL}${relative.split('/').map(encodeURIComponent).join('/')}`
}
