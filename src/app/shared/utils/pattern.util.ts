/**
 * host检验
 *
 * @param value 网络地址
 */
export function patternIpHost(value: string): boolean {
  let pattern = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)($|(?!\.$)\.)){4}$/;
  if (!pattern.exec(value)) {
    pattern = /[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?/;
    if (!pattern.exec(value)) {
      return false;
    }
  }
  return true;
}
