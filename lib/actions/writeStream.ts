import { wrapper } from '@blendededge/ferryman-extensions';
import { GenericObject, Message, Self, WriteConfig } from '../types/global';
import { errorHelper, formatMessage } from '../util';
import { writeCSV } from './write';
import { getItemsProperties, getOut } from '../util';

async function writeStream(this: Self, msg: Message, cfg: WriteConfig, tokenData: GenericObject = {}) {
  const newMsg = formatMessage(msg);
  const emitter = wrapper(this, newMsg, cfg);
  const TOKEN = cfg.token || tokenData.apiKey;

  const { data } = newMsg;
  if (data.items === null || typeof data.items !== 'object' || Array.isArray(data.items)) {
    await errorHelper(emitter, 'Input data must be Object');
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
          type: 'object',
          required: true,
          title: 'Input Object',
        },
      },
    },
    out: {},
  };

  if (cfg.order) {
    metadata.in.properties.items.properties = getItemsProperties(cfg);
  }

  metadata.out = getOut(cfg);

  return metadata;
}

module.exports.process = writeStream;
module.exports.getMetaModel = getMetaModel;
