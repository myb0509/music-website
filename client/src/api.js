/** API 请求基础路径（生产环境由 VITE_API_BASE 环境变量注入） */
export const API_BASE = import.meta.env.VITE_API_BASE || ''

/**
 * 统一的 fetch 封装，自动拼接 API base URL
 */
export function api(path, options = {}) {
  return fetch(API_BASE + path, options)
}

/**
 * 拼接资源完整 URL（用于 audio/img src）
 */
export function assetUrl(path) {
  return API_BASE + (path || '')
}
