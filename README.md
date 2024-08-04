# KV-Synced

This Node.js package is a Key-Value distributed storage solution. Available at [NPM](https://www.npmjs.com/package/kv-synced). Used in [Obsidian Simply Spaced plugin](https://github.com/andrewromanenco/obsidian-simply-spaced).

### Main APIs

- load: Loads all changes and resolves conflicts (more on this below).
- put(key: string, values: { [key: string]: string }): Sets values for a given key.
- get(key: string): { [key: string]: string }: Gets values for a given key.
- commit: Stores all updated keys since the last commit or load.

The library requires a provider for reading and writing files from a folder synchronized by cloud drives (OneDrive, iCloud, etc). See the *CloudDrive* interface for more details.

The library includes a versioning/conflict resolution strategy:

- LWW (LWWVersionHandler): Last Write Wins.
- More strategies to come later.

### Architecture

The library manages an in-memory map of keys (with values also being maps). Upon each commit, updated or new records are stored in write-once files. Over time, the number of these files grows, and the load operation consolidates them into a single write-once file, removing old chunks.

The library is cloud drive-friendly. Since all files are write-once artifacts, file synchronization across devices is conflict-free.

To accommodate different file systems and synchronization APIs, the IO is abstracted via the CloudDrive interface. For example, [an implementation of the interface using Obsidian APIs](https://github.com/andrewromanenco/obsidian-simply-spaced/blob/main/obsidian-fs.ts).

Conflicts, such as the same key being updated twice, are resolved by a conflict resolution strategy specified during library initialization. Custom strategies may be added by implementing VersionHandler interface.

### Sample usage
```
const fs = YOUR implementation of CloudDrive
const kvs = new  KV(fs, new  LWWVersionHandler());
await  this.kvs.load(); // with all conflict resolved

kvs.put('key', {
	'some':'data',
	'and':'more data'
})

kvs.commit() // Saves updated keys
```

### Other

```
npx jest --coverage # To run tests with coverage
npm run build # To build the project
```