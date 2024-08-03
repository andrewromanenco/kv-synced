import {describe, expect, jest, it, beforeEach} from '@jest/globals';
import {KV} from '../src/kv';
import {CloudDrive} from '../src/cloud-drive';
import {VersionHandler} from '../src/version';

describe('KV-test', () => {

    let  kv: KV;
    let mockedCloudDrive: jest.Mocked<CloudDrive>;
    let mockedVersionHandler: jest.Mocked<VersionHandler>;

    beforeEach(() => {
       
    });

    it('should load single record', async () => {
        mockedCloudDrive = {
            list: jest.fn().mockReturnValueOnce(Promise.resolve(['a'])),
            read: jest.fn().mockReturnValueOnce(Promise.resolve('{"key1":{"values":{"a":"b"},"version":{"v":"1"}}}')),
            write: jest.fn(),
            delete: jest.fn()
        } as jest.Mocked<CloudDrive>;

        kv = new KV(mockedCloudDrive, mockedVersionHandler);

        await kv.load();
        expect(kv.size()).toBe(1);

        const value = kv.get('key1');
        expect(value).toBeDefined();
        expect(value!['a']).toBe('b');

        expect(kv.get('non-existing')).toBeUndefined();
    });

    it('should call version handler when key is loaded twice', async () => {
        mockedCloudDrive = {
            list: jest.fn().mockReturnValueOnce(Promise.resolve(['a', 'b'])),
            read: jest.fn().mockImplementation(async (name) => {
                if (name === 'a') {
                    return Promise.resolve('{"key1":{"values":{"a1":"b1"},"version":{"v":"1"}}}');
                }
                if (name === 'b') {
                    return Promise.resolve('{"key1":{"values":{"a2":"b2"},"version":{"v":"2"}}}');
                }
                throw new Error("Unknown param");
            }),
            write: jest.fn(),
            delete: jest.fn()
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

        await kv.load();
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

    it('should load two records from two files', async () => {
        mockedCloudDrive = {
            list: jest.fn().mockReturnValueOnce(Promise.resolve(['a', 'b'])),
            read: jest.fn().mockImplementation((name) => {
                if (name === 'a') {
                    return Promise.resolve('{"key1":{"values":{"a1":"b1"}}}');
                }
                if (name === 'b') {
                    return Promise.resolve('{"key2":{"values":{"a2":"b2"}}}');
                }
                throw new Error("Unknown param");
            }),
            write: jest.fn(),
            delete: jest.fn()
        } as jest.Mocked<CloudDrive>;

        kv = new KV(mockedCloudDrive, mockedVersionHandler);

        await kv.load();
        expect(kv.size()).toBe(2);

        const value1 = kv.get('key1');
        expect(value1).toBeDefined();
        expect(value1!['a1']).toBe('b1');

        const value2 = kv.get('key2');
        expect(value2).toBeDefined();
        expect(value2!['a2']).toBe('b2');
    });

    it('should save single new record in empty KV', async () => {
        mockedCloudDrive = {
            list: jest.fn().mockReturnValueOnce(Promise.resolve([])),
            read: jest.fn(),
            write: jest.fn(),
            delete: jest.fn()
        } as jest.Mocked<CloudDrive>;

        mockedVersionHandler = {
            stampNewRecord: jest.fn().mockReturnValueOnce({"v":"1"}),
            stampExistingRecord: jest.fn(),
            handleConflict: jest.fn()
        } as jest.Mocked<VersionHandler>;

        kv = new KV(mockedCloudDrive, mockedVersionHandler);

        await kv.load();

        kv.put('newKey', {'a':'b'});
        await kv.commit();
        expect(mockedCloudDrive.write).toHaveBeenCalled();
        const callArg = mockedCloudDrive.write.mock.calls[0][0];
        const json = JSON.parse(callArg);
        expect(json['newKey']).toBeDefined();
        expect(json['newKey']['values']).toBeDefined();
        expect(json['newKey']['values']['a']).toBe('b');
        expect(json['newKey']['version']).toBeDefined();
        expect(json['newKey']['version']['v']).toBe('1');

    });

    it('should load single record and override it', async () => {
        mockedCloudDrive = {
            list: jest.fn().mockReturnValueOnce(Promise.resolve(['a'])),
            read: jest.fn().mockReturnValueOnce(Promise.resolve('{"key1":{"values":{"a":"b"},"version":{"v":"1"}}}')),
            write: jest.fn(),
            delete: jest.fn()
        } as jest.Mocked<CloudDrive>;

        mockedVersionHandler = {
            stampNewRecord: jest.fn(),
            stampExistingRecord: jest.fn().mockReturnValueOnce({"v":"2"}),
            handleConflict: jest.fn()
        } as jest.Mocked<VersionHandler>;

        kv = new KV(mockedCloudDrive, mockedVersionHandler);

        await kv.load();
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

        await kv.commit();
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

        await kv.commit();
        expect(mockedCloudDrive.write).toHaveBeenCalledTimes(1);
    });

    it('should compact database when there are ten base failes', async () => {
        mockedCloudDrive = {
            list: jest.fn().mockReturnValueOnce(Promise.resolve([
                'f1', 'f2', 'f3', 'f4', 'f5','f6', 'f7', 'f8', 'f9', 'f10'])),
            read: jest.fn().mockReturnValue('{"key1":{"values":{"x":"y"}}}'),
            write: jest.fn(),
            delete: jest.fn()
        } as jest.Mocked<CloudDrive>;

        mockedVersionHandler = {
            stampNewRecord: jest.fn(),
            stampExistingRecord: jest.fn(),
            handleConflict: jest.fn().mockReturnValue({
                values: {
                    "x":"z"
                },
                version: {
                    "v":"10"
                }
            })
        } as jest.Mocked<VersionHandler>;

        kv = new KV(mockedCloudDrive, mockedVersionHandler);

        await kv.load();
        expect(kv.size()).toBe(1);

        const value = kv.get('key1');
        expect(value).toBeDefined();
        expect(value!['x']).toBe('z');

        expect(mockedCloudDrive.write).toHaveBeenCalledTimes(1);
        const callArg = mockedCloudDrive.write.mock.calls[0][0];
        const json = JSON.parse(callArg);
        expect(json['key1']).toBeDefined();
        expect(json['key1']['values']).toBeDefined();
        expect(json['key1']['values']['x']).toBe('z');
        expect(json['key1']['version']).toBeDefined();
        expect(json['key1']['version']['v']).toBe('10');

        expect(mockedCloudDrive.delete).toHaveBeenCalledTimes(10);

        const filesToDelete = ['f1', 'f2', 'f3', 'f4', 'f5','f6', 'f7', 'f8', 'f9', 'f10'];
        for (let i = 0; i < 10; i++) {
            const fileArg = mockedCloudDrive.delete.mock.calls[i][0];
            expect(fileArg).toBe(filesToDelete[i]);
        }
    });
});
