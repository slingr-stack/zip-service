const svc = require('@slingr/slingr-services');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const AdmZip = require('adm-zip');

// Monkey-patch fs.writeFileSync to create parent directories if they don't exist
// This is needed because svc.files.upload doesn't create parent directories
// when the filename contains path separators
const originalWriteFileSync = fsSync.writeFileSync;
fsSync.writeFileSync = function(filePath, data, options) {
    const dir = path.dirname(filePath);
    if (!fsSync.existsSync(dir)) {
        fsSync.mkdirSync(dir, { recursive: true });
    }
    return originalWriteFileSync.call(this, filePath, data, options);
};

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
    let filePath = `/tmp/${fileId}`;
    await fs.writeFile(filePath, data);
    const zip = new AdmZip(filePath);
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
        // Upload with full path - monkey-patched fs.writeFileSync will create parent dirs
        let file = await svc.files.upload(zipEntry.entryName, zipEntry.getData());
        files.push(file);
    }
    return files;
}

module.exports = {
    zipFiles,
    unzipFile,
};

