const svc = require('@slingr/slingr-services');
const { zipFiles, zipFilesSafe, unzipFile } = require('./zip.js');

svc.hooks.onSvcStart = () => {
    svc.logger.info('ZIP Service has started');
}

svc.hooks.onSvcStop = (cause) => {
    svc.logger.info('ZIP Service is stopping.');
}

svc.functions.zipFiles = ({ params, id }) => {
    let { files, fileName } = params;
    fileName ??= id + '.zip'; // Default file name

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

svc.functions.zipFilesSafe = ({ params, id }) => {
    let { files, fileName } = params;
    fileName ??= id + '.zip'; // Default file name

    zipFilesSafe(files)
        .then(async (contents) => {
            let files = [];
            for (let i = 0; i < contents.length; i++) {
                const content = contents[i];
                const currentFileName = `${fileName}_${i + 1}.zip`; // Use a unique file name for each part

                try {
                    //upload current file
                    let file = await svc.files.upload(currentFileName, content);
                    svc.events.send('OnZipPartComplete', {
                        file,
                        part: i + 1,
                        totalParts: content.length,
                        ok: true,
                    }, id);
                } catch (uploadError) {
                    svc.events.send('OnZipPartComplete', {
                        part: i + 1,
                        ok: false,
                        error: uploadError.message
                    }, id);
                }
            }
            svc.events.send('onZipSafeComplete', {
                files,
                ok: true,
            }, id);
        })
        .catch(err => {
            svc.events.send('onZipSafeComplete', {
                ok: false,
                error: err.message,
            }, id);
        });
    return { ok: true };
};

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
