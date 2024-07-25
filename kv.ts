import {CloudDrive} from './cloud-drive';
import {KVList, Values} from './kv-record';
import {VersionHandler} from './version';

class KV {
    private cloudDrive:CloudDrive;
    private versionHandler: VersionHandler;
    private cleanRecords: KVList;
    private dirtyRecords: KVList;

    constructor(cloudDrive:CloudDrive, versionHandler: VersionHandler) {
            this.cloudDrive = cloudDrive;
            this.versionHandler = versionHandler;
            this.cleanRecords = {};
            this.dirtyRecords = {};
    }

    load():void {
        const list = this.cloudDrive.list();
        list.forEach((file:any) => {
            const content = this.cloudDrive.read(file);
            const storedKVList = JSON.parse(content) as KVList;
            Object.keys(storedKVList).forEach((key) => {
                const value = storedKVList[key];
                if (key in this.cleanRecords) {
                    this.cleanRecords[key] = this.versionHandler.handleConflict(
                        key,
                        this.cleanRecords[key],
                        value
                        );
                } else {
                    this.cleanRecords[key] = value;
                }
            });
        });
    }

    get(key: string):Values|undefined {
        if (key in this.dirtyRecords) {
            return this.dirtyRecords[key].values;
        }
        if (key in this.cleanRecords) {
            return this.cleanRecords[key].values;
        }
        return undefined;
    }

    put(key: string, values: Values): void {
        if (key in this.cleanRecords) {
            const existingRecord = this.cleanRecords[key];
            delete this.cleanRecords[key];
            this.dirtyRecords[key] = {
                values: values,
                version: this.versionHandler.stampExistingRecord(
                    values, existingRecord.version)
            }
        } else {
            this.dirtyRecords[key] = {
                values: values,
                version: this.versionHandler.stampNewRecord(values)
            }
        }
    }

    commit(): void {
        if (Object.keys(this.dirtyRecords).length == 0) {
            return;
        }
        const jsonString = JSON.stringify(this.dirtyRecords);
        this.cloudDrive.write(jsonString);
        Object.keys(this.dirtyRecords).forEach((key) => {
            this.cleanRecords[key] = this.dirtyRecords[key];
        });
        this.dirtyRecords = {};
    }

    size():number {
        return Object.keys(this.cleanRecords).length + Object.keys(this.dirtyRecords).length;
    }
}

export {KV};