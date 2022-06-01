/* eslint-disable @typescript-eslint/no-explicit-any */
import { Writable } from 'stream';
import { GenericObject, Self } from './types/global';
import { arrayToObject } from './util';

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
            await this.emitter.emit('data', { data })
            this.parseStream.resume()
        }
    }
}