import { Wrapped } from "@blendededge/ferryman-extensions";

export type GenericObject = Record<string, any>;

export interface Message {
    id: string,
    attachments: GenericObject,
    data: GenericObject,
    headers: GenericObject,
    metadata: GenericObject,
    body?: GenericObject
}

export interface ReadConfig {
    emitAll?: boolean | string;
    header?: boolean;
    delimiter?: string;
    dynamicTyping?: boolean;
    attachmentServiceUrl?: string;
}

export interface WriteConfig {
    uploadToAttachment?: boolean;
    separator?: string;
    order?: string;
}

export interface CSVWrapped extends Wrapped {
    emit: Function;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Self = any;