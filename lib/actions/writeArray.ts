import { wrapper } from '@blendededge/ferryman-extensions';
import { GenericObject, Message, Self, WriteConfig } from '../types/global';
import { errorHelper, formatMessage, getItemsProperties, getOut } from '../util';
import { writeCSV } from './write';
import * as jwt from 'jsonwebtoken';

async function writeArray(this: Self, msg: Message, cfg: WriteConfig, tokenData: GenericObject) {
    const token = jwt.decode(msg.properties?.headers.orchestratorToken);
    const newMsg = formatMessage(msg);
    const emitter = wrapper(this, newMsg, cfg);
    const TOKEN = cfg.token ? cfg.token : tokenData?.apiKey;
    emitter.logger.info('here is token', token)
    emitter.logger.info('here is properties', JSON.stringify(msg.properties))

  const { data } = newMsg;
  if (!Array.isArray(data.items)) {
    await errorHelper(emitter, 'Input data must be Array');
    return;
  }
  if (data.items.length < 1) {
    await errorHelper(emitter, 'Empty Array');
    return;
  }
  await writeCSV(msg, cfg, emitter, TOKEN);
}

function getMetaModel(cfg: WriteConfig) {
  const metadata: GenericObject = {
    in: {
      type: 'object',
      properties: {
        header: {
          type: 'boolean',
          required: true,
          title: 'Include Headers',
        },
        items: {
          type: 'array',
          required: true,
          title: 'Input Array',
          items: {
            type: 'object',
            required: true,
            properties: {
            },
          },
        },
      },
    },
    out: {},
  };

  if (cfg.order) {
    metadata.in.properties.items.items.properties = getItemsProperties(cfg);
  }

  metadata.out = getOut(cfg);

  return metadata;
}

module.exports.process = writeArray;
module.exports.getMetaModel = getMetaModel;
