export interface ModelMapping {
  guid: string;
  publicModel: string;
  aliases: string;
  upstreamModel: string;
  provider: string;
  accountGroup: string;
  stream: boolean;
  timeoutSec: number;
  enabled: boolean;
}

export interface ModelPayload {
  publicModel: string;
  aliases?: string;
  upstreamModel: string;
  provider: string;
  accountGroup?: string;
  stream?: boolean;
  timeoutSec?: number;
}

export interface ModelRouteState {
  guid: string;
  routeKey: string;
  lastAccountGuid: string;
  cursor: number;
  updatedAtUnix: number;
}
