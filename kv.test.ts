import {describe, expect, jest, it, beforeEach} from '@jest/globals';
import {KV} from './kv';
import {CloudDrive} from './cloud-drive';
import {VersionHandler} from './version';

describe('KV-test', () => {

    let  kv: KV;
    let mockedCloudDrive: jest.Mocked<CloudDrive>;
    let mockedVersionHandler: jest.Mocked<VersionHandler>;

    beforeEach(() => {
       
    });

    it('should load single record', () => {
        mockedCloudDrive = {
            list: jest.fn().mockReturnValueOnce(['a']),
            read: jest.fn().mockReturnValueOnce('{"key1":{"values":{"a":"b"},"version":{"v":"1"}}}'),
            write: jest.fn()
        } as jest.Mocked<CloudDrive>;

        kv = new KV(mockedCloudDrive, mockedVersionHandler);

        kv.load();
        expect(kv.size()).toBe(1);

        const value = kv.get('key1');
        expect(value).toBeDefined();
        expect(value!['a']).toBe('b');

        expect(kv.get('non-existing')).toBeUndefined();
    });

    it('should call version handler when key is loaded twice', () => {
        mockedCloudDrive = {
            list: jest.fn().mockReturnValueOnce(['a', 'b']),
            read: jest.fn().mockImplementation((name) => {
                if (name === 'a') {
                    return '{"key1":{"values":{"a1":"b1"},"version":{"v":"1"}}}';
                }
                if (name === 'b') {
                    return '{"key1":{"values":{"a2":"b2"},"version":{"v":"2"}}}';
                }
                throw new Error("Unknown param");
            }),
            write: jest.fn()
        } as jest.Mocked<CloudDrive>;

        mockedVersionHandler = {
            stampNewRecord: jest.fn(),
            stampExistingRecord: jest.fn(),
            handleConflict: jest.fn().mockReturnValueOnce({
                values: {
                    "x":"y"
                },
                version: {
                    "v":"1"
                }
            })
        } as jest.Mocked<VersionHandler>;

        kv = new KV(mockedCloudDrive, mockedVersionHandler);

        kv.load();
        expect(kv.size()).toBe(1);

        const value1 = kv.get('key1');
        expect(value1).toBeDefined();
        expect(value1!['x']).toBe('y');
        expect(value1!['a1']).toBeUndefined();
        expect(value1!['a2']).toBeUndefined();

        const callArgKey = mockedVersionHandler.handleConflict.mock.calls[0][0];
        expect(callArgKey).toBe('key1');
        const kvRecord1 = mockedVersionHandler.handleConflict.mock.calls[0][1];
        const kvRecord2 = mockedVersionHandler.handleConflict.mock.calls[0][2];
        expect(kvRecord1.values['a1']).toBe('b1');
        expect(kvRecord2.values['a2']).toBe('b2');
    });

    it('should load two records from two files', () => {
        mockedCloudDrive = {
            list: jest.fn().mockReturnValueOnce(['a', 'b']),
            read: jest.fn().mockImplementation((name) => {
                if (name === 'a') {
                    return '{"key1":{"values":{"a1":"b1"}}}';
                }
                if (name === 'b') {
                    return '{"key2":{"values":{"a2":"b2"}}}';
                }
                throw new Error("Unknown param");
            }),
            write: jest.fn()
        } as jest.Mocked<CloudDrive>;

        kv = new KV(mockedCloudDrive, mockedVersionHandler);

        kv.load();
        expect(kv.size()).toBe(2);

        const value1 = kv.get('key1');
        expect(value1).toBeDefined();
        expect(value1!['a1']).toBe('b1');

        const value2 = kv.get('key2');
        expect(value2).toBeDefined();
        expect(value2!['a2']).toBe('b2');
    });

    it('should save single new record in empty KV', () => {
        mockedCloudDrive = {
            list: jest.fn().mockReturnValueOnce([]),
            read: jest.fn(),
            write: jest.fn()
        } as jest.Mocked<CloudDrive>;

        mockedVersionHandler = {
            stampNewRecord: jest.fn().mockReturnValueOnce({"v":"1"}),
            stampExistingRecord: jest.fn(),
            handleConflict: jest.fn()
        } as jest.Mocked<VersionHandler>;

        kv = new KV(mockedCloudDrive, mockedVersionHandler);

        kv.load();

        kv.put('newKey', {'a':'b'});
        kv.commit();
        expect(mockedCloudDrive.write).toHaveBeenCalled();
        const callArg = mockedCloudDrive.write.mock.calls[0][0];
        const json = JSON.parse(callArg);
        expect(json['newKey']).toBeDefined();
        expect(json['newKey']['values']).toBeDefined();
        expect(json['newKey']['values']['a']).toBe('b');
        expect(json['newKey']['version']).toBeDefined();
        expect(json['newKey']['version']['v']).toBe('1');

    });

    it('should load single record and override it', () => {
        mockedCloudDrive = {
            list: jest.fn().mockReturnValueOnce(['a']),
            read: jest.fn().mockReturnValueOnce('{"key1":{"values":{"a":"b"},"version":{"v":"1"}}}'),
            write: jest.fn()
        } as jest.Mocked<CloudDrive>;

        mockedVersionHandler = {
            stampNewRecord: jest.fn(),
            stampExistingRecord: jest.fn().mockReturnValueOnce({"v":"2"}),
            handleConflict: jest.fn()
        } as jest.Mocked<VersionHandler>;

        kv = new KV(mockedCloudDrive, mockedVersionHandler);

        kv.load();
        expect(kv.size()).toBe(1);

        const originalValue = kv.get('key1');
        expect(originalValue).toBeDefined();
        expect(originalValue!['a']).toBe('b');
        expect(originalValue!['x']).toBeUndefined();

        kv.put('key1', {'x': 'y'});
        expect(kv.size()).toBe(1);

        const notYetSaved = kv.get('key1');
        expect(notYetSaved).toBeDefined();
        expect(notYetSaved!['x']).toBe('y');
        expect(notYetSaved!['a']).toBeUndefined();

        kv.commit();
        const callArg = mockedCloudDrive.write.mock.calls[0][0];
        const json = JSON.parse(callArg);
        expect(json['key1']).toBeDefined();
        expect(json['key1']['values']).toBeDefined();
        expect(json['key1']['values']['x']).toBe('y');
        expect(json['key1']['version']).toBeDefined();
        expect(json['key1']['version']['v']).toBe('2');

        const callValues = mockedVersionHandler.stampExistingRecord.mock.calls[0][0];
        const callCurrentVersion = mockedVersionHandler.stampExistingRecord.mock.calls[0][1];
        expect(callValues['x']).toBe('y');
        expect(callCurrentVersion['v']).toBe('1');

        expect(kv.size()).toBe(1);
        const saved = kv.get('key1');
        expect(saved).toBeDefined();
        expect(saved!['x']).toBe('y');
        expect(saved!['a']).toBeUndefined();

        kv.commit();
        expect(mockedCloudDrive.write).toHaveBeenCalledTimes(1);
    });
});