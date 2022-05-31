/* eslint-disable @typescript-eslint/no-explicit-any */
import { Writable } from 'stream';
import { arrayToObject } from '../util';

export type GenericObject = Record<string, any>;

export interface Message {
    id: string,
    attachments: GenericObject,
    data: GenericObject,
    headers: GenericObject,
    metadata: GenericObject,
    body?: GenericObject;
    properties?: GenericObject;
}

export interface ReadConfig {
    emitAll?: boolean | string;
    header?: boolean;
    delimiter?: string;
    dynamicTyping?: boolean;
    token?: string;
}

export interface WriteConfig {
    uploadToAttachment?: boolean;
    separator?: string;
    order?: string;
    header?: boolean;
    filenameJsonata?: string;
    token?: string;
}

export class CsvWriter extends Writable {
    logger: any;
    parseOptions: GenericObject;
    emitAll: boolean;
    parseStream: NodeJS.ReadWriteStream;
    emitter: Self;
    outputMsg: GenericObject;

    constructor(parseOptions: GenericObject, emitAll: boolean, parseStream: NodeJS.ReadWriteStream, emitter: Self, outputMsg: GenericObject) {
        super();
        this.parseOptions = parseOptions;
        this.emitAll = emitAll;
        this.parseStream = parseStream;
        this.emitter = emitter;
        this.outputMsg = outputMsg;
        this.logger = emitter.logger;
    }

    // @ts-expect-error - function originally written in JS
    async write(chunk: any) {
        let data: GenericObject = {}
        if (this.parseOptions.header) {
            data = chunk
        } else {
            data = arrayToObject(chunk)
        }
        if (this.emitAll) {
            this.outputMsg.result.push(data)
        } else {
            this.parseStream.pause()
            await this.emitter.emit('data', data)
            this.parseStream.resume()
        }
    }
}

export type Self = any;