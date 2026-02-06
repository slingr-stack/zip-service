const svc = require('@slingr/slingr-services');
const { zipFiles, unzipFile } = require('./zip.js');

svc.hooks.onSvcStart = () => {
    svc.logger.info('ZIP Service has started');
}

svc.hooks.onSvcStop = (cause) => {
    svc.logger.info('ZIP Service is stopping.');
}

/**
 * Zips an array of files and uploads the resulting zip file.
 * @param {object} args - The arguments for the function.
 * @param {object} args.params - The parameters for the function.
 * @param {Array<{fileId: string, fileName: string}>} args.params.files - An array of file objects to zip.
 * @param {string} args.params.fileName - The desired file name for the zip file. If not provided, a default name is used.
 * @param {string} args.id - The ID of the request, used for sending events.
 * @returns {object} - An object indicating success.
 */
svc.functions.zipFiles = ({ params, id }) => {
    let { files, fileName } = params;
    fileName ??= `${id}.zip`; // Default file name

    zipFiles(files)
        .then(async (content) => {
            let file = await svc.files.upload(fileName, content);
            svc.events.send('onZipComplete', {
                file,
                ok: true,
            }, id);
        })
        .catch(err => {
            svc.events.send('onZipComplete', {
                ok: false,
                error: err.message,
            }, id);
        });
    return { ok: true };
};

/**
 * Unzips a file and uploads the extracted files.
 * @param {object} args - The arguments for the function.
 * @param {object} args.params - The parameters for the function.
 * @param {string} args.params.fileId - The ID of the zip file to unzip.
 * @param {object} args.params.options - Options for unzipping, including password.
 * @returns {object} - An object indicating success.
 */
svc.functions.unzipFile = ({ params, id }) => {
    let { fileId, options } = params;

    unzipFile(fileId, options)
        .then(async (files) => {
            svc.events.send('onUnzipComplete', {
                files,
                ok: true,
            }, id);
        })
        .catch(err => {
            svc.events.send('onUnzipComplete', {
                ok: false,
                error: err.message,
            }, id);
        });
    return { ok: true };
};

svc.start();
