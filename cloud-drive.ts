/**
 * Interface represents a storage with read/write/list operations.
 * For example, this could be a path to a folder synced by a cloud drive.
 */
export interface CloudDrive {
    list():any[];
    read(fileHandle:any): string;
    write(content: string):void;
}