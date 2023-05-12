import type { Web5Agent } from '@tbd54566975/web5-agent';
import type {
  MessageReply,
  ProtocolsConfigureOptions,
  ProtocolsQueryOptions,
  RecordsDeleteOptions,
  RecordsQueryOptions,
  RecordsReadOptions,
  RecordsReadReply,
  RecordsWriteDescriptor,
  RecordsWriteMessage,
  RecordsWriteOptions,
} from '@tbd54566975/dwn-sdk-js';

import { DwnInterfaceName, DwnMethodName, DataStream } from '@tbd54566975/dwn-sdk-js';

import { Record } from './record.js';
import { dataToBytes, isDataSizeUnderCacheLimit, isEmptyObject } from './utils.js';

export type ProtocolsConfigureRequest = {
  author: string;
  message: Omit<ProtocolsConfigureOptions, 'authorizationSignatureInput'>;
}

export type ProtocolsQueryRequest = {
  author: string;
  message: Omit<ProtocolsQueryOptions, 'authorizationSignatureInput'>
}

export type RecordsDeleteRequest = {
  author: string;
  message: Omit<RecordsDeleteOptions, 'authorizationSignatureInput'>;
}

export type RecordsCreateRequest = RecordsWriteRequest;

export type RecordsCreateResponse = RecordsWriteResponse;

export type RecordsCreateFromRequest = {
  author: string;
  data: unknown;
  message?: Omit<RecordsWriteOptions, 'authorizationSignatureInput' | 'data'>;
  record: Record;
}

export type RecordsDeleteResponse = MessageReply;

// TODO: Export type RecordsQueryReplyEntry and EncryptionProperty from dwn-sdk-js.
export type RecordsQueryReplyEntry = {
  recordId: string,
  contextId?: string;
  descriptor: RecordsWriteDescriptor;
  encryption?: RecordsWriteMessage['encryption'];
  encodedData?: string;
};

export type RecordsQueryRequest = {
  author: string;
  message: Omit<RecordsQueryOptions, 'authorizationSignatureInput'>;
}

export type RecordsQueryResponse = MessageReply & {
  records: Record[]
};

export type RecordsReadRequest = {
  author: string;
  message: Omit<RecordsReadOptions, 'authorizationSignatureInput'>;
}

export type RecordsReadResponse = MessageReply & {
  record: Record;
};

export type RecordsWriteRequest = {
  author: string;
  data: unknown;
  message?: Omit<RecordsWriteOptions, 'authorizationSignatureInput' | 'data'>;
}

export type RecordsWriteResponse = MessageReply & {
  record?: Record
};

/**
 * TODO: Document class.
 */
export class DwnApi {
  constructor(private web5Agent: Web5Agent) {}

  /**
 * TODO: Document namespace.
 */
  get protocols() {
    return {
      /**
       * TODO: Document method.
       */
      configure: async (target: string, request: ProtocolsConfigureRequest) => {
        return await this.web5Agent.processDwnRequest({
          target         : target,
          author         : request.author,
          messageOptions : request.message,
          messageType    : DwnInterfaceName.Protocols + DwnMethodName.Configure
        });
      },

      /**
       * TODO: Document method.
       */
      query: async (target: string, request: ProtocolsQueryRequest) => {
        return await this.web5Agent.processDwnRequest({
          author         : request.author,
          messageOptions : request.message,
          messageType    : DwnInterfaceName.Protocols + DwnMethodName.Query,
          target         : target
        });
      }
    };
  }

  /**
   * TODO: Document namespace.
   */
  get records() {
    return {
      /**
       * TODO: Document method.
       */
      create: async (target: string, request: RecordsCreateRequest): Promise<RecordsCreateResponse> => {
        return this.records.write(target, request);
      },

      /**
       * TODO: Document method.
       */
      createFrom: async (target: string, request: RecordsCreateFromRequest): Promise<RecordsWriteResponse> => {
        const { author: inheritedAuthor, ...inheritedProperties } = request.record.toJSON();

        // Remove target from inherited properties since target is being explicitly defined in method parameters.
        delete inheritedProperties.target;


        // If `data` is being updated then `dataCid` and `dataSize` must not be present.
        if (request.data !== undefined) {
          delete inheritedProperties.dataCid;
          delete inheritedProperties.dataSize;
        }

        // If `published` is set to false, ensure that `datePublished` is undefined. Otherwise, DWN SDK's schema validation
        // will throw an error if `published` is false but `datePublished` is set.
        if (request.message?.published === false && inheritedProperties.datePublished !== undefined) {
          delete inheritedProperties.datePublished;
          delete inheritedProperties.published;
        }

        // If the request changes the `author` or message `descriptor` then the deterministic `recordId` will change.
        // As a result, we will discard the `recordId` if either of these changes occur.
        if (!isEmptyObject(request.message) || (request.author && request.author !== inheritedAuthor)) {
          delete inheritedProperties.recordId;
        }

        return this.records.write(target, {
          author  : request.author || inheritedAuthor,
          data    : request.data,
          message : {
            ...inheritedProperties,
            ...request.message,
          },
        });
      },

      /**
       * TODO: Document method.
       */
      delete: async (target: string, request: RecordsDeleteRequest): Promise<RecordsDeleteResponse> => {
        const { author, message: requestMessage } = request;

        const messageOptions: Partial<RecordsDeleteOptions> = {
          ...requestMessage
        };

        const agentResponse = await this.web5Agent.processDwnRequest({
          author,
          messageOptions,
          messageType: DwnInterfaceName.Records + DwnMethodName.Delete,
          target
        });

        const { reply: { status } } = agentResponse;

        return { status };
      },

      /**
       * TODO: Document method.
       */
      query: async (target: string, request: RecordsQueryRequest): Promise<RecordsQueryResponse> => {
        const { author, message: requestMessage } = request;

        const messageOptions: Partial<RecordsQueryOptions> = {
          ...requestMessage
        };

        const agentResponse = await this.web5Agent.processDwnRequest({
          author,
          messageOptions,
          messageType: DwnInterfaceName.Records + DwnMethodName.Query,
          target
        });

        const { reply: { entries, status } } = agentResponse;

        const records = entries.map((entry: RecordsQueryReplyEntry) => {
          const recordOptions = {
            author,
            target,
            ...entry as RecordsWriteMessage
          };
          const record = new Record(this.web5Agent, recordOptions);
          return record;
        });

        return { records, status };
      },

      /**
       * TODO: Document method.
       */
      read: async (target: string, request: RecordsReadRequest): Promise<RecordsReadResponse> => {
        const { author, message: requestMessage } = request;

        const messageOptions: Partial<RecordsReadOptions> = {
          ...requestMessage
        };

        const agentResponse = await this.web5Agent.processDwnRequest({
          author,
          messageOptions,
          messageType: DwnInterfaceName.Records + DwnMethodName.Read,
          target
        });

        const { reply } = agentResponse;
        const { record: responseRecord, status } = reply as RecordsReadReply;

        let record: Record;
        if (200 <= status.code && status.code <= 299) {
          const recordOptions = {
            author,
            target,
            ...responseRecord,
          };

          record = new Record(this.web5Agent, recordOptions);
        }

        return { record, status };
      },

      /**
       * TODO: Document method.
       *
       * As a convenience, the Record instance returned will cache a copy of the data if the
       * data size, in bytes, is less than the DWN 'max data size allowed to be encoded'
       * parameter of 10KB. This is done to maintain consistency with other DWN methods,
       * like RecordsQuery, that include relatively small data payloads when returning
       * RecordsWrite message properties. Regardless of data size, methods such as
       * `record.data.stream()` will return the data when called even if it requires fetching
       * from the DWN datastore.
       */
      write: async (target: string, request: RecordsWriteRequest): Promise<RecordsWriteResponse> => {
        const { author, data, message: requestMessage } = request;

        const messageOptions: Partial<RecordsWriteOptions> = {
          ...requestMessage
        };

        let dataStream: _Readable.Readable;

        if (data instanceof Blob || data instanceof ReadableStream) {
          //! TODO: get dataSize and dataCid of data
        } else {
          const { dataBytes, dataFormat } = dataToBytes(request.data, messageOptions.dataFormat);
          messageOptions.data = dataBytes;
          messageOptions.dataFormat = dataFormat;
          dataStream = DataStream.fromBytes(dataBytes);
        }

        const agentResponse = await this.web5Agent.processDwnRequest({
          author,
          dataStream,
          messageOptions,
          messageType: DwnInterfaceName.Records + DwnMethodName.Write,
          target
        });

        const { message, reply: { status } } = agentResponse;
        const responseMessage = message as RecordsWriteMessage;

        let record: Record;
        if (200 <= status.code && status.code <= 299) {
          // As a convenience, store a copy of relatively small data with the Record instance.
          const encodedData = isDataSizeUnderCacheLimit(responseMessage.descriptor.dataSize) ? messageOptions.data : null;

          const recordOptions = {
            author,
            encodedData,
            target,
            ...responseMessage,
          };

          record = new Record(this.web5Agent, recordOptions);
        }

        return { record, status };
      },
    };
  }
}