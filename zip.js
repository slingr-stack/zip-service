const svc = require('@slingr/slingr-services');
const fs = require('node:fs/promises');
const path = require('node:path');
const AdmZip = require('adm-zip');

async function zipFiles(files) {
    const zip = new AdmZip();
    for (let { fileId, fileName } of files) {
        let data = await svc.files.download(fileId);
        zip.addFile(fileName, Buffer.from(data, 'utf8'));
    }
    return zip.toBuffer();
}

async function unzipFile(fileId, options = {}) {
    let data = await svc.files.download(fileId);
    let tmpPath = `/tmp/${fileId}`;
    await fs.writeFile(tmpPath, data);
    const zip = new AdmZip(tmpPath);
    let files = [];
    const zipEntries = zip.getEntries(options.password);
    for (let zipEntry of zipEntries) {
        if (zipEntry.isDirectory) {
            continue; // Ignore directories
        }
        let cleanFileName = path.basename(zipEntry.entryName);
        let file = await svc.files.upload(cleanFileName, zipEntry.getData());
        files.push(file);
    }
    return files;
}

module.exports = {
    zipFiles,
    unzipFile,
};

