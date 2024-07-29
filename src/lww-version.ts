import { Values, Version, KVRecord } from './kv-record';
import { VersionHandler } from './version';
/**
 * Lasw Write Wins conflict resolution
 */
export class LWWVersionHandler implements VersionHandler {

    private timestampSuppier: TimestampISOStrSupplier;

    constructor(timestampSuppier: TimestampISOStrSupplier = () => {return new Date().toISOString()}) {
        this.timestampSuppier = timestampSuppier;

    }
    stampNewRecord(values: Values): Version {
        return {
            "timestamp": this.timestampSuppier()
        }
    }
    stampExistingRecord(values: Values, currentVersion: Version): Version {
        return {
            "timestamp": this.timestampSuppier()
        }
    }
    handleConflict(key: string, one: KVRecord, two: KVRecord): KVRecord {
        const date1 = new Date(one.version['timestamp']);
        const date2 = new Date(two.version['timestamp']);
        return date1 > date2 ? one : two;
    }

}

export interface TimestampISOStrSupplier {
    (): string;
  }
