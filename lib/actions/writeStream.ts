import { wrapper } from '@blendededge/ferryman-extensions';
import { GenericObject, Self } from '../types/global';
import { errorHelper, formatMessage } from '../util';
import { writeCSV } from './write';
import { Snapshot, Message, Config, IncomingHeaders } from '@blendededge/ferryman-extensions/lib/ferryman-types';

async function writeStream(this: Self, msg: Message, cfg: Config, snapshot: Snapshot, headers: IncomingHeaders, tokenData: GenericObject) {
    const newMsg = formatMessage(msg);
    const emitter = wrapper(this, newMsg, cfg);
    const token = cfg.token || tokenData.apiKey;

    const { data } = newMsg;
    if (data.items === null || typeof data.items !== 'object' || Array.isArray(data.items)) {
        await errorHelper(emitter, 'Input data must be Object');
        return;
    }

    await writeCSV({ msg, cfg, emitter, token });
    emitter.emit('end');
    return;
}

module.exports.process = writeStream;