import { GenericObject, Self } from './types/global';
import { Message } from '@blendededge/ferryman-extensions/lib/ferryman-types';

interface OldMsg extends Message {
  body?: GenericObject;
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

export const formatMessage = (msg: Message): Message => {
  const newMessage = msg as OldMsg;
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
}
