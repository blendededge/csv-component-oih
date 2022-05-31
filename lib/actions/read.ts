/* eslint-disable @typescript-eslint/no-explicit-any */
import { CsvWriter, GenericObject, Message, ReadConfig, Self } from '../types/global';
import { wrapper } from '@blendededge/ferryman-extensions';
import * as stream from 'stream';
import * as util from 'util';
import * as papa from 'papaparse';
import { booleanCheck, errorHelper, formatMessage } from '../util';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AttachmentProcessor } = require('@blendededge/ferryman-extensions');
import * as jwt from 'jsonwebtoken';

const pipeline = util.promisify(stream.pipeline);

async function readCSV(this: Self, msg: Message, cfg: ReadConfig, tokenData: GenericObject = {}) {
    const newMsg = formatMessage(msg);
    const token = jwt.decode(msg.properties?.headers.orchestratorToken)
    const emitter = wrapper(this, newMsg, cfg) as any;
    const TOKEN = cfg.token || tokenData.apiKey;

    const { attachments, data } = newMsg;
    const emitAll = cfg.emitAll === true || cfg.emitAll === 'true';

    // eslint-disable-next-line max-len
    const attachmentProcessor = new AttachmentProcessor(emitter, TOKEN);
    const attachment = attachments[data.filename];

    if (!attachment || !attachment.url || attachment.url.length < 1) {
        await errorHelper(emitter, 'URL of the CSV is missing')
        return;
    }
    emitter.logger.info('URL found');

    const header = cfg.header ? cfg.header : data.header;
    const dynamicTyping = cfg.dynamicTyping ? cfg.dynamicTyping : data.dynamicTyping;
    const delimiter = cfg.delimiter ? cfg.delimiter : data.delimiter;

    const headerNotBoolean = booleanCheck(header);
    const dynamicTypingNotBoolean = booleanCheck(dynamicTyping);
    if (headerNotBoolean) {
        await errorHelper(emitter, 'Non-boolean values are not supported by "Contains headers" field');
        return;
    }
    if (dynamicTypingNotBoolean) {
        await errorHelper(emitter, 'Non-boolean values are not supported by "Convert Data types" field');
        return;
    }

    const parseOptions = {
        header,
        dynamicTyping,
        delimiter
    }

    const outputMsg: GenericObject = {
        result: [],
    }

    let dataStream;
    const parseStream = papa.parse(papa.NODE_STREAM_INPUT, parseOptions);

    try {
        dataStream = await attachmentProcessor.getAttachment(attachment.url, 'stream');
        emitter.logger.info('File received, trying to parse CSV');
    } catch (err) {
        emitter.logger.error(`URL - "${attachment.url}" unreachable: ${err}`);
        emitter.emit('error', `URL - "${attachment.url}" unreachable: ${err}`);
        emitter.emit('end');
        return;
    }

    const writerStream = new CsvWriter(parseOptions, emitAll, parseStream, emitter, outputMsg);

    try {
        await pipeline(
            dataStream.data,
            parseStream,
            // @ts-expect-error - function originally written in JS
            writerStream
        )
        emitter.logger.info('File parsed successfully')
    } catch (err) {
        emitter.logger.error(`error during file parse: ${err}`);
        emitter.emit('error', `error during file parse: ${err}`);
        emitter.emit('end');
        return
    }

    if (emitAll) {
        await emitter.emit('data', { data: writerStream.outputMsg });
    }
    emitter.logger.info(`Complete, memory used: ${process.memoryUsage().heapUsed / 1024 / 1024} Mb`)
}

module.exports.process = readCSV
