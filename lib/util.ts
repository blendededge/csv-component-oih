import { GenericObject, Message, Self, WriteConfig } from './types/global';
import * as papa from 'papaparse';

export function getItemsProperties(cfg: WriteConfig) {
  const properties: GenericObject = {};
  const delimiter = cfg.separator ? cfg.separator : ',';
  // @ts-expect-error - function originally written in JS
  const fields = papa.parse(order, { delimiter }).data[0].map((x: string) => { return x.trim() });
  fields.forEach((element: string) => {
    properties[element] = {
      type: 'string',
      required: false,
      title: element,
    };
  });
  return properties;
}

export function getOut(cfg: WriteConfig) {
  let out;

  if (cfg.uploadToAttachment) {
    out = {
      type: 'object',
      properties: {
        attachmentUrl: {
          type: 'string',
          required: true,
          title: 'A URL to the CSV',
        },
        type: {
          type: 'string',
          required: true,
          title: 'File type',
        },
        size: {
          type: 'number',
          required: true,
          title: 'Size in bytes',
        },
        attachmentCreationTime: {
          type: 'string',
          required: true,
          title: 'When generated',
        },
        contentType: {
          type: 'string',
          required: true,
          title: 'Content type',
        },
      },
    };
  } else {
    out = {
      type: 'object',
      properties: {
        csvString: {
          type: 'string',
          required: true,
          title: 'CSV as a string',
        },
      },
    };
  }

  return out;
}

// transform array to obj, for example:
// ['aa', 'bb', 'cc'] => {column0: 'aa', column1: 'bb', column2: 'cc'}
export const arrayToObject = (arr: Array<string>): Record<string, string> => {
  let columns = {};
  arr.forEach((value, index) => {
    columns = { ...columns, ...{ [`column${index}`]: value } }
  });
  return columns;
}

export const formatMessage = (msg: Message) => {
  const newMessage = msg;
  if (newMessage.body) {
      newMessage.data = newMessage.body;
  }
  return newMessage;
}

export const booleanCheck = (value: unknown) => {
  return value !== undefined && value !== '' && (typeof value) !== 'boolean';
}

export const errorHelper = async (self: Self, message: string): Promise<void> => {
  await self.logger.error(message);
  await self.emit('error', message);
  await self.emit('end');
}
