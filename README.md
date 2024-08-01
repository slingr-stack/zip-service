<table class="table" style="margin-top: 10px">
    <thead>
    <tr>
        <th>Title</th>
        <th>Last Updated</th>
        <th>Summary</th>
    </tr>
    </thead>
    <tbody>
    <tr>
        <td>ZIP Service</td>
        <td>August 1, 2024</td>
        <td>Allows zip and unzip files</td>
    </tr>
    </tbody>
</table>

# Overview

The Zip service provides functionality for compressing and decompressing files
into and from the ZIP archive format.

# Javascript API

## Zip Files

- `svc.zip.zipFiles`

```js
let files = [];
let cursor = sys.data.find('files');
while (cursor.hasNext()) {
  let record = cursor.next();
  files.push({
    fileId: record.field('file').id(),
    fileName: record.field('file').name(),
  })
}

let callback = function (res, resData) {
  if (res.data.ok) {
    sys.logs.info(`Zip completed ${res.data.file.fileId}]`, { res, resData });
  } else {
    sys.logs.warn(`Error Zipping files`, { res, resData });
  }
}

let callbacks = {
  onZipComplete: callback,
}

let resData = {
  test: true,
};

const fileName = 'myZip.zip';
svc.zip.zipFiles({ files, fileName: fileName }, resData, callbacks);
```

## Unzip file

- `svc.zip.unzipFile`

```js
let fileId = '66abfba84e4c911940bba9d0';

let callback = function (res, resData) {
  if (res.data.ok) {
    sys.logs.info(`Unzip completed`, { res, resData });
    let { files } = res.data;
    sys.logs.info(`Unzip completed ${files.length}]`, { res, resData });
  } else {
    sys.logs.warn(`Error unzipping file`, { res, resData });
  }
}

let callbacks = {
  onUnzipComplete: callback,
}

let resData = {
  test: true,
};

// Optional
let options = {
  recursive: false,
  password: null, // If zip is password protected
}

svc.zip.unzipFile({ fileId: fileId, options: options }, resData, callbacks);
```

# About SLINGR

SLINGR is a low-code rapid application development platform that accelerates development,
with robust architecture for integrations and executing custom workflows and automation.

[More info about SLINGR](https://slingr.io)

# License

This package is licensed under the Apache License 2.0. See the `LICENSE` file for more details.
