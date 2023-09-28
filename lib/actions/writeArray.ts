import { wrapper } from '@blendededge/ferryman-extensions';
import { Self } from '../types/global';
import { errorHelper, formatMessage } from '../util';
import { writeCSV } from './write';
import { Snapshot, Message, Config, IncomingHeaders, TokenData } from '@blendededge/ferryman-extensions/lib/ferryman-types';

async function writeArray(this: Self, msg: Message, cfg: Config, snapshot: Snapshot, headers: IncomingHeaders, tokenData: TokenData) {
    const newMsg = formatMessage(msg);
    const emitter = await wrapper(this, newMsg, cfg, snapshot, headers, tokenData);
    const token = cfg.token ? cfg.token : tokenData?.apiKey;

    const { data } = newMsg;
    if (!Array.isArray(data.items)) {
        await errorHelper(emitter, 'Input data must be Array');
        return;
    }
    if (data.items.length < 1) {
        await errorHelper(emitter, 'Empty Array');
        return;
    }
    await writeCSV({ msg, cfg, emitter, token });
    emitter.emit('end');
    return;
}

module.exports.process = writeArray;
