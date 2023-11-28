# CSV Component

The CSV Component transforms CSV attachments and strings to JSON and JSON to either CSV strings or attachments. It is useful when using Open Integration Hub flows that interact with CSV documents, because the message data being acted on during a flow is formatted as JSON.

## Functions & Configuration Fields

### Read
Reads a CSV file either from text or from a file attachment.

- `emitAll` - ?
- `headers` - If true, assumes the first row of the CSV is a header row.
- `delimitter` - Overrides the default delimitter of `,`.
- `dynamicTyping` - If true, automatically converts number and boolean data in the CSV to the appropriate data type. Otherwise, all values remain strings.
- `attachmentStorageServiceUrl` - Overrides the attachment storage service URL provided to the component by the component orchestrator.

### Write Array
Creates a CSV file from a JSON array of records.

### Write Stream
Creates a CSV file from a stream of JSON records.
