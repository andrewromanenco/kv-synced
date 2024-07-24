import {describe, expect, jest, it, beforeEach} from '@jest/globals';
import {KV} from './kv';
import {CloudDrive} from './cloud-drive';

describe('KV-test', () => {

    let  kv: KV;
    let mockedCloudDrive: jest.Mocked<CloudDrive>;

    beforeEach(() => {
       
    });

    it('should load single record', () => {
        mockedCloudDrive = {
            list: jest.fn().mockReturnValueOnce(['a']),
            read: jest.fn().mockReturnValueOnce('{"key1":{"values":{"a":"b"}}}'),
            write: jest.fn()
        } as jest.Mocked<CloudDrive>;

        kv = new KV(mockedCloudDrive);

        kv.load();
        expect(kv.size()).toBe(1);

        const value = kv.get('key1');
        expect(value).toBeDefined();
        expect(value!['a']).toBe('b');

        expect(kv.get('non-existing')).toBeUndefined();
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

        kv = new KV(mockedCloudDrive);

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

        kv = new KV(mockedCloudDrive);

        kv.load();

        kv.put('newKey', {'a':'b'});
        kv.commit();
        expect(mockedCloudDrive.write).toHaveBeenCalled();
        const callArg = mockedCloudDrive.write.mock.calls[0][0];
        const json = JSON.parse(callArg);
        expect(json['newKey']).toBeDefined();
        expect(json['newKey']['values']).toBeDefined();
        expect(json['newKey']['values']['a']).toBe('b');
    });

    it('should load single record and override it', () => {
        mockedCloudDrive = {
            list: jest.fn().mockReturnValueOnce(['a']),
            read: jest.fn().mockReturnValueOnce('{"key1":{"values":{"a":"b"}}}'),
            write: jest.fn()
        } as jest.Mocked<CloudDrive>;

        kv = new KV(mockedCloudDrive);

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

        expect(kv.size()).toBe(1);
        const saved = kv.get('key1');
        expect(saved).toBeDefined();
        expect(saved!['x']).toBe('y');
        expect(saved!['a']).toBeUndefined();

        kv.commit();
        expect(mockedCloudDrive.write).toHaveBeenCalledTimes(1);
    });
});