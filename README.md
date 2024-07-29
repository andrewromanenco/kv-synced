# KV-Synced

This Node.js package is a Key-Value distributed storage solution.

### Main APIs

- load: Loads all changes and resolves conflicts (more on this below).
- put(key: string, values: { [key: string]: string }): Sets values for a given key.
- get(key: string): { [key: string]: string }: Gets values for a given key.
- commit: Stores all updated keys since the last commit or load.

The library requires a provider for reading and writing files from a folder synchronized by cloud drives (OneDrive, iCloud, etc). See the *CloudDrive* interface for more details.

The library includes a versioning/conflict resolution strategy:

- LWW (LWWVersionHandler): Last Write Wins.
- More strategies to come later.

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