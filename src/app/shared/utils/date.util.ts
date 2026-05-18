function formatNumber(n: number | string) {
  n = n.toString();
  return n[1] ? n : `0${n}`;
}

export function formatTime(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  return `${[year, month, day].map(formatNumber).join('-')} ${[hour, minute, second].map(formatNumber).join(':')}`;
}

export function formatOnlyTime(date: Date): string {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  return [hour, minute, second].map(formatNumber).join(':');
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return [year, month, day].map(formatNumber).join('-');
}

export function utc2beijing(utcTime: string): string {
  let timestamp = new Date(Date.parse(utcTime)).getTime();
  timestamp = timestamp + 8 * 60 * 60 * 1000;
  const beijing_datetime = formatTime(new Date(timestamp));
  return beijing_datetime;
}

export function utctimestamp2beijing(timestamp: number): string {
  timestamp = timestamp + 8 * 60 * 60 * 1000;
  const beijing_datetime = formatTime(new Date(timestamp));
  return beijing_datetime;
}

export function beijingstamp2utctimestamp(timestamp: number): number {
  timestamp = timestamp - 8 * 60 * 60 * 1000;
  return timestamp;
}

export function beijing2utc(beijingTime: string): string {
  let timestamp = new Date(Date.parse(beijingTime)).getTime();
  timestamp = timestamp - 8 * 60 * 60 * 1000;
  const utc_datetime = formatTime(new Date(timestamp));
  return utc_datetime;
}

export function beijing2utctimestamp(beijingTime: string): number {
  let timestamp = new Date(Date.parse(beijingTime)).getTime();
  timestamp = timestamp - 8 * 60 * 60 * 1000;
  return timestamp;
}

export function beijingDate2utctimestamp(beijingTime: Date): number {
  let timestamp = beijingTime.getTime();
  timestamp = timestamp - 8 * 60 * 60 * 1000;
  return timestamp;
}
