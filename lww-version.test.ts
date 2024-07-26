import {describe, expect, jest, it, beforeEach} from '@jest/globals';
import { LWWVersionHandler, TimestampISOStrSupplier} from './lww-version';

describe('KV-test', () => {

    let lww: LWWVersionHandler;

    beforeEach(() => {
       
    });

    it('new record gets a timestamp', () => {
        const tms: TimestampISOStrSupplier = () => {return "timestamp"};
        lww = new LWWVersionHandler(tms);
        const result = lww.stampNewRecord({"a":"b"})
        expect(result['timestamp']).toBe("timestamp");
    });

    it('existing record gets a timestamp', () => {
        const tms: TimestampISOStrSupplier = () => {return "timestamp"};
        lww = new LWWVersionHandler(tms);
        const result = lww.stampExistingRecord({"a":"b"}, {"timestamp":"current"});
        expect(result['timestamp']).toBe("timestamp");
    });

    it('generates timestamp when no supplier provided', () => {
        lww = new LWWVersionHandler();
        const result = lww.stampNewRecord({"a":"b"})
        expect(result['timestamp']).toBeDefined();
        console.log(result['timestamp']);
    });

    it('in case of a conflict, largest timestamp wins; pick first', () => {
        lww = new LWWVersionHandler();
        const result = lww.handleConflict(
            "key",
            {
                'values': {
                    'a':'b'
                },
                'version': {
                    'timestamp':'2024-07-26T01:01:33.907Z'                    
                }
            },
            {
                'values': {
                    'x':'y'
                },
                'version': {
                    'timestamp':'2024-07-26T01:01:32.907Z'
                }
            });
        expect(result.values['a']).toBe('b');
        expect(result.version['timestamp']).toBe('2024-07-26T01:01:33.907Z');
    });

    it('in case of a conflict, largest timestamp wins; pick second', () => {
        lww = new LWWVersionHandler();
        const result = lww.handleConflict(
            "key",
            {
                'values': {
                    'a':'b'
                },
                'version': {
                    'timestamp':'2024-07-26T01:01:32.907Z'
                }
            },
            {
                'values': {
                    'x':'y'
                },
                'version': {
                    'timestamp':'2024-07-26T01:01:33.907Z'
                }
            });
        expect(result.values['x']).toBe('y');
        expect(result.version['timestamp']).toBe('2024-07-26T01:01:33.907Z');
    });

    
});
