/* eslint-disable @typescript-eslint/no-explicit-any */
import * as papa from 'papaparse';
import { AxiosResponse, GenericObject, ProceedData, Self, WriteCSV } from '../types/global';
import { booleanCheck, errorHelper, formatMessage } from '../util';
import { transform } from '@openintegrationhub/ferryman';
import { Config } from '@blendededge/ferryman-extensions/lib/ferryman-types';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AttachmentProcessor } = require('@blendededge/ferryman-extensions');

const { TIMEOUT_BETWEEN_EVENTS = 1000 /* 10s */ } = process.env;

const rawData: Array<any> = [];
let timeout: any;

export async function writeCSV({ msg, cfg, emitter, token }: WriteCSV) {
    const newMsg = formatMessage(msg);
    const { data } = newMsg;

    cfg.header = cfg.header !== undefined ? cfg.header : data.header;
    const headerNotBoolean = booleanCheck(cfg.header);
    if (headerNotBoolean) {
        await errorHelper(emitter, 'Non-boolean values are not supported by "Include headers" field');
        return;
    }

    if (Array.isArray(data.items)) {
        emitter.logger.info('input metadata is array. Proceed with data ');
        await proceedData({ data: data.items, cfg, msg, emitter, token });
        return;
    }
    // if not array - create array from all fn calls and send data to proceedData
    rawData.push(data.items);
    if (timeout) {
        clearTimeout(timeout);
    }
    const TIMEOUT = typeof TIMEOUT_BETWEEN_EVENTS !== 'number' ? parseInt(TIMEOUT_BETWEEN_EVENTS) : TIMEOUT_BETWEEN_EVENTS;
    timeout = setTimeout(() => {
        emitter.logger.info(`input metadata is object. Array creation (wait up to ${TIMEOUT}ms for more records)`);
        proceedData({ data: rawData, cfg, msg, emitter, token });
    }, TIMEOUT);
    return;
}

async function proceedData({ data, cfg, msg, emitter, token }: ProceedData): Promise<void> {
    const fileName = cfg.filenameJsonata ? transform(msg, { customMapping: cfg.filenameJsonata }) : 'data.csv';
    const csvString = createCSVString(cfg, data);

    if (!cfg.uploadToAttachment) {
        await emitter.emit('data', { data: csvString });
        emitter.logger.info(`Complete, memory used: ${process.memoryUsage().heapUsed / 1024 / 1024} Mb`);
        return;
    }

    const attachment = await uploadAttachment(emitter, token, csvString, cfg.attachmentStorageServiceUrl);
    if (!attachment) {
        await errorHelper(emitter, 'No response from uploading attachment');
        return;
    }
    await sendAttachment(attachment, csvString, fileName, emitter);
}

const createCSVString = (cfg: Config, data: Array<any>): string => {
    const delimiter = cfg.separator ? cfg.separator : ',';

    const unparseOptions = {
        header: cfg.header,
        delimiter
    };

    let csvString;
    if (!cfg.order) {
        csvString = papa.unparse(data, unparseOptions);
    } else {
        // create fields array from string
        // @ts-expect-error function originally written in JS
        const fields = papa.parse(cfg.order, { delimiter }).data[0].map(x => { return x.trim() });
        const orderedData = data.map((value) => {
            const result = fields.map((key: string) => {
                const filtered = value[key]
                return filtered
            });
            return result
        });
        csvString = papa.unparse({
            fields,
            data: orderedData
        }, unparseOptions);
    }
    return csvString;
}

const uploadAttachment = async (emitter: Self, token: string, csvString: string, attachmentServiceUrl?: string): Promise<AxiosResponse> => {
    let attachmentProcessor;
    if (attachmentServiceUrl) {
        attachmentProcessor = new AttachmentProcessor(emitter, token, attachmentServiceUrl);
    } else {
        attachmentProcessor = new AttachmentProcessor(emitter, token);
    }

    let attachment;
    try {
        attachment = await attachmentProcessor.uploadAttachment(csvString, 'text/csv') as AxiosResponse;
        return attachment;
    } catch (err) {
        await errorHelper(emitter, `Upload attachment failed: ${err}`);
        return;
    }
}

const sendAttachment = async (attachment: GenericObject, csvString: string, fileName: string, emitter: Self): Promise<void> => {
    const body = {
        attachmentUrl: attachment.config.url,
        type: '.csv',
        size: Buffer.byteLength(csvString),
        attachmentCreationTime: new Date(),
        contentType: 'text/csv',
        filename: fileName
    }

    const respData: GenericObject = {
        data: body,
        attachments: {}
    };

    respData.attachments[fileName] = {
        'content-type': body.contentType,
        size: body.size,
        url: body.attachmentUrl
    }

    await emitter.emit('data', respData);
    emitter.logger.info(`Complete, memory used: ${process.memoryUsage().heapUsed / 1024 / 1024} Mb`);
    emitter.logger.info('Attachment created successfully');
    emitter.emit('end');
}

module.exports.process = writeCSV
