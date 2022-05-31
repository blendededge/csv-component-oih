/* eslint-disable @typescript-eslint/no-explicit-any */
import * as papa from 'papaparse';
import { GenericObject, Message, Self, WriteConfig } from '../types/global';
import { booleanCheck, errorHelper, formatMessage } from '../util';
import { transform } from '@openintegrationhub/ferryman';
import * as jwt from 'jsonwebtoken';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AttachmentProcessor } = require('@blendededge/ferryman-extensions');

const { TIMEOUT_BETWEEN_EVENTS = 1000 /* 10s */ } = process.env;

const rawData: Array<string> = [];
let timeout: any;

async function proceedData(data: Array<any>, cfg: WriteConfig, originalMsg: Message, emitter: Self, token: string) {
  let csvString;
  const delimiter = cfg.separator ? cfg.separator : ',';

  const unparseOptions = {
    header: cfg.header,
    delimiter
  };

  const fileName = cfg.filenameJsonata ? transform(originalMsg, { expression: cfg.filenameJsonata }) : 'data.csv';

  if (cfg.order) {
    // create fields array from string
    // @ts-expect-error function originally written in JS
    const fields = papa.parse(cfg.order, { delimiter }).data[0].map(x => { return x.trim() })
    const orderedData = data.map((value) => {
      const result = fields.map((key: string) => {
        const filtered = value[key]
        return filtered
      })
      return result
    })
    csvString = papa.unparse({
      fields,
      data: orderedData
    }, unparseOptions)
  } else {
    csvString = papa.unparse(data, unparseOptions);
  }

  if (!cfg.uploadToAttachment) {
    await emitter.emit('data', { data: csvString });
    emitter.logger.info(`Complete, memory used: ${process.memoryUsage().heapUsed / 1024 / 1024} Mb`);
    return;
  }
  emitter.logger.info('here is attachment storage url', process.env.ELASTICIO_ATTACHMENT_STORAGE_SERVICE_BASE_URL)
  emitter.logger.info('here is token', jwt.decode(originalMsg.properties?.headers.orchestratorToken))
  emitter.logger.info('here are props', JSON.stringify(originalMsg.properties))
  // eslint-disable-next-line max-len
  const attachmentProcessor = new AttachmentProcessor(emitter, jwt.decode(originalMsg.properties?.headers.orchestratorToken), process.env.ELASTICIO_ATTACHMENT_STORAGE_SERVICE_BASE_URL);
  let attachment;
  try {
    attachment = await attachmentProcessor.uploadAttachment(csvString, 'text/csv');
  } catch (err) {
    await errorHelper(emitter, `Upload attachment failed: ${err}`);
    return;
  }

  const body = {
    attachmentUrl: attachment.config.url,
    type: '.csv',
    size: Buffer.byteLength(csvString),
    attachmentCreationTime: new Date(),
    contentType: 'text/csv',
    filename: fileName
  }

  const respData: GenericObject = {
      data: body
  };

  respData.attachments[fileName] = {
    'content-type': body.contentType,
    size: body.size,
    url: body.attachmentUrl
  }

  await emitter.emit('data', respData);
  emitter.logger.info(`Complete, memory used: ${process.memoryUsage().heapUsed / 1024 / 1024} Mb`);
  emitter.logger.info('Attachment created successfully');
}

export async function writeCSV(msg: Message, cfg: WriteConfig, emitter: Self, token: string) {
  const newMsg = formatMessage(msg);
  const { data } = newMsg;

  cfg.header = cfg.header !== undefined ? cfg.header : data.header;

  const headerNotBoolean = booleanCheck(cfg.header);
  if (headerNotBoolean) {
    await errorHelper(emitter, 'Non-boolean values are not supported by "Include headers" field');
    return;
  }

  // if not array - create array from all fn calls and send data to proceedData
  if (Array.isArray(data.items)) {
    emitter.logger.info('input metadata is array. Proceed with data ')
    await proceedData(data.items, cfg, msg, emitter, token);
    return;
  } else {
    rawData.push(data.items)
    if (timeout) {
        clearTimeout(timeout)
    }
    const TIMEOUT = typeof TIMEOUT_BETWEEN_EVENTS !== 'number' ? parseInt(TIMEOUT_BETWEEN_EVENTS) : TIMEOUT_BETWEEN_EVENTS;
    timeout = setTimeout(() => {
      emitter.logger.info(`input metadata is object. Array creation (wait up to ${TIMEOUT}ms for more records)`)
      proceedData(rawData, cfg, msg, emitter, token)
    }, TIMEOUT);
  }
}

module.exports.process = writeCSV
