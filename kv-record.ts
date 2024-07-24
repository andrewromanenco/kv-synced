/**
 * Customer provided values to store for a key
 */
interface Values {
    [key: string]: string;
}

/**
 * Internal storage record
 */
interface KVRecord {
    values: Values;
}

/**
 * List of records kept syncronized
 */
interface KVList {
    [key: string]: KVRecord;
}

export {KVList, KVRecord, Values};