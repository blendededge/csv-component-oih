import { describe, it, afterEach} from 'node:test';
import { expect } from 'chai';
import { Readable } from 'node:stream';
import sinon from 'sinon';
import * as read from '../../dist/actions/read.js';
import ferryman from '@blendededge/ferryman-extensions';
import fs from 'fs';

// Mock the required modules
const mockGetAttachment = sinon.stub();

sinon.replace(ferryman.AttachmentProcessor.prototype, 'getAttachment', mockGetAttachment);

const self = {
    emit: sinon.spy(),
    logger: {
      debug: () => {},
      info: () => {},
      error: sinon.spy(),
      child: () => self.logger,
    },
  };

describe('readCSV', () => {
    afterEach(() => { self.emit.resetHistory(); });

    it('should handle successful execution', async () => {
        // Import the csv file as a stream
        const csvContent = fs.readFileSync('spec/actions/data/generated_customers.csv', 'utf8');
        const mockStream = Readable.from([csvContent]);
        mockGetAttachment.returns(Promise.resolve({ data: mockStream }));

        const logger = { info: sinon.spy(), error: sinon.spy() };
        logger.child = sinon.stub().returns(logger);
        // Setup the test parameters
        const mockMsg = { attachments: { 'test.csv': { url: 'http://example.com/test.csv' } }, data: { filename: 'test.csv' } };
        const mockCfg = { token: 'testToken', attachmentStorageServiceUrl: 'http://example.com', header: true };
        const mockSnapshot = {};
        const mockHeaders = {};
        const mockTokenData = {};

        // Invoke the function
        await read.process.bind(self)(mockMsg, mockCfg, mockSnapshot, mockHeaders, mockTokenData);

        const calls = self.emit.getCalls();

        // Assertions to validate the output
        expect(self.emit.calledWith('data')).to.be.true;

        const expectedJSONDataFile = fs.readFileSync('spec/actions/data/generated_customers.json', 'utf8');
        const expectedJSONData = JSON.parse(expectedJSONDataFile);
        // Assert each emitted data object contains the expected properties
        calls.forEach((call, index) => {
            if(call.args[0] !== 'data') return;
            const emittedData = call.args[1]?.data;
            expect(emittedData).to.have.all.keys(['cust_id', 'cust_name', 'cust_addr2', 'cust_addr3', 'cust_addr4', 'cust_city', 'cust_state', 'cust_zip', 'tax_group', 'inv_cust_id', 'active', 'csc_d_upd']);
            expect(emittedData).to.deep.equal(expectedJSONData[index]);
        });
    });
});
