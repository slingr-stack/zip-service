const svc = require('@slingr/slingr-services');
const fs = require('node:fs/promises');
const AdmZip = require('adm-zip');

/**
 * Zips an array of files into a single zip file.
 * @param {Array<{fileId: string, fileName: string}>} files - An array of objects, each containing a fileId and fileName.
 * @returns {Promise<Buffer>} - A promise that resolves with the Buffer containing the zipped data.
 */
async function zipFiles(files) {
    const zip = new AdmZip();
    for (let { fileId, fileName } of files) {
        let data = await svc.files.download(fileId);
        zip.addFile(fileName, Buffer.from(data, 'utf8'));
    }
    return zip.toBuffer();
}

/**
 * Unzips a file and uploads the extracted files.
 * @param {string} fileId - The ID of the zip file to unzip.
 * @param {object} options - Options for unzipping, including password.
 * @returns {Promise<Array<object>>} - A promise that resolves with an array of file objects.
 */
async function unzipFile(fileId, options = {}) {
    let data = await svc.files.download(fileId);
    let path = `/tmp/${fileId}`;
    await fs.writeFile(path, data);
    const zip = new AdmZip(path);
    let files = [];
    const zipEntries = zip.getEntries(options.password)
        .filter(entry => !entry.isDirectory); // ZIP Files are flat - Recursive is the default
    for (let zipEntry of zipEntries) {
        let file = await svc.files.upload(zipEntry.entryName, zipEntry.getData());
        files.push(file);
    }
    return files;
}

module.exports = {
    zipFiles,
    unzipFile,
};

