/**
 * 字节大小转换显示
 *
 * @export
 * @param {number} size
 * @return {*}  {string}
 */
export function getSize(size: number, type = 2): string {
  if (0 === size) {
    return '0 Bytes';
  }
  const c = 1024;
  const d = type || 2;
  const e = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const f = Math.floor(Math.log(size) / Math.log(c));
  return `${parseFloat((size / Math.pow(c, f)).toFixed(d))} ${e[f]}`;
}

/**
 * base64
 *
 * @param file
 * @returns
 */
export const getBase64 = (file: File): Promise<string | ArrayBuffer | null> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

/**
 * 获取文件的后缀
 *
 * @param filename 文件名
 * @returns 后缀
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop() || '';
};

/**
 * 生成GUID
 *
 * @returns guid
 */
export const generateGUID = (): string => {
  return 'xxxxxxxx'
    .replace(/[xy]/g, (c) => {
      let r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
    .replaceAll('-', '');
};
