/* eslint-disable @typescript-eslint/no-explicit-any */
import { Config, Message } from '@blendededge/ferryman-extensions/lib/ferryman-types';

export type GenericObject = Record<string, any>;
export interface ProceedData {
    data: Array<any>;
    cfg: Config;
    msg: Message;
    emitter: Self;
    token: string;
}

export interface WriteCSV {
    cfg: Config;
    msg: Message;
    emitter: Self;
    token: string;
}

export interface ProcessedConfig {
    header: boolean;
    emitAll: boolean;
    delimiter: string;
    dynamicTyping: boolean;
}

export type AxiosResponse = any;

export type Self = any;