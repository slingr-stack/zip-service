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

svc.functions.zipFilesSafe = async ({ params, id }) => {
    let { files, fileName } = params;
    fileName ??= id + '.zip'; // Default file name
    try {
        await zipFilesSafe(files, async (content, partNumber) => {

            const currentFileName = `${fileName}_part${partNumber}.zip`;

            // Upload current zip part
            let file = await svc.files.upload(currentFileName, content);

            // Notify success for this part
            svc.events.send('onZipPartComplete', {
                file,
                part: partNumber,
                ok: true,
            }, id);
        });

        // Notify overall completion
        svc.events.send('onZipSafeComplete', { ok: true }, id);
        

    } catch (err) {
        svc.events.send('onZipSafeComplete', {
            ok: false,
            error: err.message
        }, id);
    }
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
