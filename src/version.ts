import {KVRecord, Values, Version} from './kv-record';

export interface VersionHandler {
    stampNewRecord(values:Values):Version;
    stampExistingRecord(values:Values, currentVersion:Version):Version;
    handleConflict(key: string, one: KVRecord, two: KVRecord): KVRecord;
}