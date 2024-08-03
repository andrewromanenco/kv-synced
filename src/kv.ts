import {CloudDrive} from './cloud-drive';
import {KVList, Values} from './kv-record';
import {VersionHandler} from './version';

class KV {
    private static readonly COMPACT_LIMIT: number = 10;

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

    async load():Promise<void> {
        const list = await this.cloudDrive.list();
        for (let i = 0; i < list.length; i++) {
            const file = list[i];
            const content = await this.cloudDrive.read(file);
            const storedKVList = JSON.parse(content) as KVList;
            for (const key in storedKVList) {
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
            }
        }
        await this.compactDB(list);
    }

    private async compactDB(listOfFile:any[]): Promise<void> {
        if (listOfFile.length >= KV.COMPACT_LIMIT) {
            const jsonString = JSON.stringify(this.cleanRecords);
            await this.cloudDrive.write(jsonString);
            for (let i = 0; i < listOfFile.length; i++) {
                const file = listOfFile[i];
                await this.cloudDrive.delete(file);
            }
        }
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

    async commit(): Promise<void> {
        if (Object.keys(this.dirtyRecords).length == 0) {
            return;
        }
        const jsonString = JSON.stringify(this.dirtyRecords);
        await this.cloudDrive.write(jsonString);
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

export { LWWVersionHandler } from './lww-version';
export { type CloudDrive } from './cloud-drive';
