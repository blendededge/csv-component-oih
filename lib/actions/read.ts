import { AxiosResponse, GenericObject, ProcessedConfig, Self } from '../types/global';
import { wrapper } from '@blendededge/ferryman-extensions';
import * as stream from 'stream';
import * as util from 'util';
import * as papa from 'papaparse';
import { booleanCheck, errorHelper, formatMessage } from '../util';
import { Snapshot, Message, Config, IncomingHeaders, TokenData } from '@blendededge/ferryman-extensions/lib/ferryman-types';
import { CsvWriter } from '../csvWriter';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AttachmentProcessor } = require('@blendededge/ferryman-extensions');

async function readCSV(this: Self, msg: Message, cfg: Config, snapshot: Snapshot, headers: IncomingHeaders, tokenData: TokenData) {
    let emitter;
    try {
        const newMsg = formatMessage(msg);
        emitter = await wrapper(this, newMsg, cfg, snapshot, headers, tokenData);
        const TOKEN = cfg.token || tokenData.apiKey;

        const { attachments, data } = newMsg;

        let attachmentProcessor;
        if (cfg.attachmentStorageServiceUrl) {
            attachmentProcessor = new AttachmentProcessor(emitter, TOKEN, cfg.attachmentStorageServiceUrl);
        } else {
            attachmentProcessor = new AttachmentProcessor(emitter, TOKEN);
        }
        const attachment = attachments[(data.filename as string)] as GenericObject;

        if (!attachment || !attachment.url || attachment.url.length < 1) {
            await errorHelper(emitter, 'URL of the CSV is missing');
            return;
        }
        emitter.logger.info('URL found');

        const attachmentResponse = await getAttachment(attachmentProcessor, attachment, emitter);
        if (!attachmentResponse) {
            emitter.emit('end');
            return;
        }

        await parseData(cfg, data, emitter, attachmentResponse);
        emitter.emit('end');
        return;
    } catch (err) {
        if (emitter) {
            emitter.emit('error', err);
            emitter.logger.error(`Error during processing: ${err}`);
        } else {
            this.emit('error', err);
            this.logger.error(`Error during processing: ${err}`);
        }
    }
}

const processCfg = async (cfg: Config, data: Config, emitter: Self): Promise<ProcessedConfig | boolean> => {
    const header = cfg.header ? cfg.header : data.header;
    const dynamicTyping = cfg.dynamicTyping ? cfg.dynamicTyping : data.dynamicTyping;
    const delimiter = cfg.delimiter ? cfg.delimiter : data.delimiter;
    const emitAll = cfg.emitAll === true || cfg.emitAll === 'true';

    const headerNotBoolean = booleanCheck(header);
    const dynamicTypingNotBoolean = booleanCheck(dynamicTyping);
    if (headerNotBoolean) {
        await errorHelper(emitter, 'Non-boolean values are not supported by "Contains headers" field');
        return false;
    }
    if (dynamicTypingNotBoolean) {
        await errorHelper(emitter, 'Non-boolean values are not supported by "Convert Data types" field');
        return false;
    }
    return { header, dynamicTyping, delimiter, emitAll };
}

const getAttachment = async (attachmentProcessor: typeof AttachmentProcessor, attachment: GenericObject, emitter: Self): Promise<boolean | AxiosResponse> => {
    let dataStream;
    try {
        dataStream = await attachmentProcessor.getAttachment(attachment.url, 'stream') as AxiosResponse;
        emitter.logger.info('File received, trying to parse CSV');
        return dataStream;
    } catch (err) {
        await errorHelper(emitter, `URL - "${attachment.url}" unreachable: ${err}`);
        return;
    }
}

const parseData = async (cfg: Config, data: Config, emitter: Self, dataStream: AxiosResponse) => {
    const config = await processCfg(cfg, data, emitter);
    if (!config) {
        return;
    }
    const { header, dynamicTyping, delimiter, emitAll } = config as ProcessedConfig;

    const parseOptions = {
        header,
        dynamicTyping,
        delimiter
    }

    const writerStreamResponse: CsvWriter | void = await processPipeline(parseOptions, emitAll, emitter, dataStream);
    if (!writerStreamResponse) {
        return;
    }

    if (emitAll) {
        await emitter.emit('data', { data: writerStreamResponse.outputMsg });
    }
    emitter.logger.info(`Complete, memory used: ${process.memoryUsage().heapUsed / 1024 / 1024} Mb`);
    return;
}

const processPipeline = async (parseOptions: GenericObject, emitAll: boolean, emitter: Self, dataStream: AxiosResponse) => {
    const pipeline = util.promisify(stream.pipeline);
    const outputMsg: GenericObject = {
        result: [],
    }

    const parseStream = papa.parse(papa.NODE_STREAM_INPUT, parseOptions);
    const writerStream = new CsvWriter(parseOptions, emitAll, parseStream, emitter, outputMsg);

    try {
        await pipeline(
            dataStream.data,
            parseStream,
            // @ts-expect-error - function originally written in JS
            writerStream
        )
        emitter.logger.info('File parsed successfully');
        return writerStream;
    } catch (err) {
        emitter.logger.error(`error during file parse: ${err}`);
        emitter.emit('error', `error during file parse: ${err}`);
        emitter.emit('end');
        return
    }
}

export = {
    process: readCSV,
    processCfg,
    getAttachment,
    parseData,
    processPipeline,
};
