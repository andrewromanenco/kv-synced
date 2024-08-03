/**
 * Interface represents a storage with read/write/list operations.
 * For example, this could be a path to a folder synced by a cloud drive.
 */
export interface CloudDrive {
    list():Promise<any[]>;
    read(fileHandle:any): Promise<string>;
    write(content: string):Promise<void>;
    delete(fileHandle:any): Promise<void>;
}