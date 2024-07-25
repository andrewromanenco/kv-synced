/**
 * Customer provided values to store for a key
 */
interface Values {
    [key: string]: string;
}

interface Version {
    [key: string]: string;
}

/**
 * Internal storage record
 */
interface KVRecord {
    values: Values;
    version: Version;
}

/**
 * List of records kept syncronized
 */
interface KVList {
    [key: string]: KVRecord;
}

export {KVList, KVRecord, Values, Version};
