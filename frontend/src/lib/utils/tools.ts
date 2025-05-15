import crypto from 'crypto';

/**
 * 生成哈希
 * @param {string} str - 要进行哈希的原始字符串
 * @returns {string} - 哈希后的字符串
 */
export const generateHash = (str: string) => {
  const hash = crypto.createHash('sha256').update(str).digest('hex');
  return hash;
};

export const safeParseJSON = (jsonString: string) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return {};
  }
};

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export function generateRandomString(length: number) {
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
