const svc = require('@slingr/slingr-services');
const fs = require('node:fs/promises');
const path = require('node:path');
const AdmZip = require('adm-zip');

// Monkey-patch fs.writeFileSync to create parent directories if they don't exist
// This is needed because svc.files.upload (via the slingr-services library) creates
// temp file paths by concatenating the filename directly, which fails when the filename
// contains path separators like 'model/types/file.json'
const originalWriteFileSync = fsSync.writeFileSync;
fsSync.writeFileSync = function(filePath, data, options) {
    const dir = path.dirname(filePath);
    // Use try-catch to avoid race conditions - mkdirSync with recursive:true
    // won't error if the directory already exists
    try {
        fsSync.mkdirSync(dir, { recursive: true });
    } catch (err) {
        // Ignore errors - directory might already exist or be created by another process
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

