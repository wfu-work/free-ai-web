export function degree2DMS(obj: number): string {
  let objs = String(obj);
  if (obj) {
    let degree = objs.substring(0, objs.indexOf('.'));
    if (degree.length < 3) {
      degree = `&nbsp;&nbsp;${degree}`;
    }
    const minute = Number(`0${objs.substring(objs.indexOf('.'), objs.length)}`) * 60;
    const minuteString = String(minute);
    const second =
      Number(`0${minuteString.substring(minuteString.indexOf('.'), minuteString.length)}`) * 60;
    const submin =
      minuteString.substring(0, minuteString.indexOf('.')).length < 2
        ? `0${minuteString.substring(0, minuteString.indexOf('.'))}`
        : minuteString.substring(0, minuteString.indexOf('.'));
    const subsec =
      String(second).substring(0, String(second).indexOf('.')).length < 2
        ? `0${String(second).substring(0, String(second).indexOf('.'))}`
        : String(second).substring(0, String(second).indexOf('.'));
    return `${degree}°${submin}′${subsec}″`;
  } else {
    return '';
  }
}
