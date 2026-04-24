const svc = require('@slingr/slingr-services');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const AdmZip = require('adm-zip');

// Monkey-patch fs.writeFileSync to create parent directories if they don't exist
// This is needed because svc.files.upload (via the slingr-services library) creates
// temp file paths by concatenating the filename directly, which fails when the filename
// contains path separators like 'model/types/file.json'
const originalWriteFileSync = fsSync.writeFileSync;
const MAX_ZIP_SIZE = 9.5 * 1024 * 1024; // 9.5MB en bytes

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

async function zipFilesSafe(files) {
    const zips = [];
    let currentZip = new AdmZip();

    for (let { fileId, fileName } of files) {
        const data = await svc.files.download(fileId);
        const buffer = Buffer.from(data, 'utf8');

        currentZip.addFile(fileName, buffer);

        if (currentZip.toBuffer().length > MAX_ZIP_SIZE) {
            // Sacar el archivo que hizo superar el límite
            currentZip.deleteFile(fileName);
            // Guardar el zip actual y empezar uno nuevo con ese archivo
            zips.push(currentZip.toBuffer());
            currentZip = new AdmZip();
            currentZip.addFile(fileName, buffer);
        }
    }

    zips.push(currentZip.toBuffer());

    return zips;
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
        // Upload file with full path preserved - the monkey-patched fs.writeFileSync
        // will ensure parent directories exist when the library creates temp files
        let file = await svc.files.upload(zipEntry.entryName, zipEntry.getData());
        if (!file) {
            // Sometimes it fails silently and we will retry one more time
            file = await svc.files.upload(zipEntry.entryName, zipEntry.getData());
        }
        if (file) {
            file.fullPath = zipEntry.entryName; // Include full path in the response for reference
            files.push(file);
        } else {
            svc.appLogger.error(`Failed to upload file: ${zipEntry.entryName}`);
        }
    }
    return files;
}

module.exports = {
    zipFiles,
    zipFilesSafe,
    unzipFile,
};

