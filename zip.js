const svc = require('@slingr/slingr-services');
const fs = require('node:fs/promises');
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
    let path = `/tmp/${fileId}`;
    await fs.writeFile(path, data);
    const zip = new AdmZip(path);
    let files = [];
    const zipEntries = zip.getEntries(options.password);
    for (let zipEntry of zipEntries) {
        if (zipEntry.isDirectory) {
            // Skip directory entries as they cannot be uploaded as files
            // Files in directories will be handled by their full path
            continue;
        }
        if (!options.recursive && zipEntry.entryName.includes('/')) {
            // Skip files in subdirectories when not in recursive mode
            continue;
        }
        let file = await svc.files.upload(zipEntry.entryName, zipEntry.getData());
        files.push(file);
    }
    return files;
}

module.exports = {
    zipFiles,
    unzipFile,
};

