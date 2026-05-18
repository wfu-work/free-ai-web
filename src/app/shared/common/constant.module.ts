/**
 * 天地图token
 */
export const TMAP_TOKEN = '335858900df6512ae00fba47fe3bc8fb';

/**
 * 分页数据结果
 *
 * @export
 * @interface PageEntity
 */
export interface PageEntity<T = any> {
  total: number;
  size: number;
  page: number;
  data: T[];
}

/**
 * 分页查询条件
 *
 * @export
 * @interface PageQuery
 */
export interface PageQuery {
  size: number;
  page: number;
  asc?: string;
  desc?: string;
  [key: string]: any;
}

export interface User {
  companyGuid: string;
  guid: string;
  username: string;
  email: string;
  phone: string;
  avatarUrl: string;
  nickName: string;
  remark: string;
}

/**
 * 文本信息
 */
export const EditorCode = {
  tutorials: '使用教程',
  agree: '用户协议',
  policy: '隐私政策',
};

/**
 * 附件类型
 */
export const FileTypeEnum = {
  img: 'img',
  video: 'video',
  audio: 'audio',
};

/**
 * 系统常量
 */
export const SystemInfo = {
  active: 'active',
  activication: 'activication',
  rtop: 'rtop',
  platform: 'platform',
  company: 'company',
  project: 'project',
  enterprise: 'slope-radar-enterprise',
};

/**
 * 系统角色
 */
export const Roles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  COMMON_USER: 'COMMON_USER',
};

/**
 * 平台集合
 */
export const Platforms = {
  iot_cloud: '北斗数据中台',
  iot_monitor: '北斗监测平台',
  iot_dataset: '数据分析平台',
};

/**
 * 数据字典Code
 */
export const DictionaryCode = {
  manufacturer: 'manufacturer',
  deviceType: 'device_type',
  deviceParameter: 'device_parameter',
  protocol: 'protocol',
};

/**
 * 卫星系统
 */
export const NavSys = {
  '1': 'GPS',
  '2': 'SBAS',
  '4': 'Glonass',
  '8': 'Galileo',
  '16': 'QZSS',
  '32': 'BDS',
  '64': 'IRN',
};

/**
 * 推送类型
 */
export const PushTypes = {
  HTTP: '省市HTTP推送',
  MQTT: '省市MQTT推送',
  NAVMG: '守明推送',
};

/**
 * 设备类型
 */
export const DeviceType = {
  GP: '北斗接收机',
  SP: '视频',
  LF: '裂缝计',
  YL: '雨量计',
  QJ: '倾角计',
  JS: '加速度计',
  LB: '声光报警',
  MM: '地基雷达',
  TS: '土壤水分计',
  QX: '气象站',
  WY: '位移计',
  SZY: '水准仪',
  ZT: '状态数据',
  WA: '告警数据',
  RA: '风险面数据',
  DM: '一维雷达',
  GSW: '北斗水位计',
  KQ: '空气质量检测仪',
};

/**
 * 监测类型
 *
 * @type {any[]}
 * @memberof EditComponent
 */
export const MonitorTypeList: any[] = [
  { value: 'GP', label: '地表形变监测' },
  { value: 'MM', label: '地基雷达监测' },
  { value: 'SP', label: '视频监测' },
  { value: 'QX', label: '气象监测' },
  { value: 'YL', label: '雨量监测' },
  { value: 'LF', label: '裂缝监测' },
  { value: 'QJ', label: '倾角监测' },
  { value: 'JS', label: '加速度监测' },
  { value: 'WY', label: '位移监测' },
  { value: 'SZY', label: '水准仪监测' },
  { value: 'TS', label: '土壤水分监测' },
  { value: 'LB', label: '声光报警监测' },
  { value: 'ZT', label: '状态数据监测' },
  { value: 'DM', label: '一维雷达监测' },
  { value: 'GSW', label: '北斗水位计监测' },
  { value: 'KQ', label: '空气质量监测' },
];

/**
 * 设备类型
 *
 * @type {any[]}
 * @memberof DeviceListComponent
 */
export const DeviceTypes: any[] = [
  { value: 'GP', label: '北斗接收机' },
  { value: 'MM', label: '地基雷达' },
  { value: 'SP', label: '视频' },
  { value: 'QX', label: '气象站' },
  { value: 'YL', label: '雨量计' },
  { value: 'LF', label: '裂缝计' },
  { value: 'QJ', label: '倾角计' },
  { value: 'WY', label: '位移计' },
  { value: 'SZY', label: '水准仪' },
  { value: 'TS', label: '土壤水分计' },
  { value: 'LB', label: '声光报警器' },
  { value: 'DM', label: '一维雷达' },
  { value: 'GSW', label: '北斗水位计' },
  { value: 'KQ', label: '空气质量检测仪' },
];

export const DeviceTypeIcon: any = {
  GP: 'assets/icon/GP.svg',
  GPS: 'assets/icon/GPS.svg',
  SP: 'assets/icon/SP.svg',
  LF: 'assets/icon/LF.svg',
  YL: 'assets/icon/YL.svg',
  QJ: 'assets/icon/QJ.svg',
  LB: 'assets/icon/LB.svg',
  MM: 'assets/icon/MM.svg',
  TS: 'assets/icon/TS.svg',
  QX: 'assets/icon/QX.svg',
  WY: 'assets/icon/WY.svg',
  SZY: 'assets/icon/SZY.svg',
  DM: 'assets/icon/WY.svg',
  GSW: 'assets/icon/YL.svg',
  KQ: 'assets/icon/WY.svg',
};

export const PntsChromatography = [
  'rgb(182, 5, 23)', // 红
  'rgb(253, 1, 26)', // 橙
  'rgb(255, 255, 47)', // 黄
  'rgb(3, 234, 16)', // 绿
  'rgb(1, 255, 253)', // 青
  'rgb(0, 8, 254)', // 蓝
  'rgb(1, 32, 96)', // 紫
];
