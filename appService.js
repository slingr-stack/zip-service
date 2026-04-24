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
            const sizeInBytes = content.byteLength;
            const sizeInMB = sizeInBytes / (1024 * 1024);

            console.log(` holaaaaa ${sizeInMB.toFixed(2)} MB`);

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
                // Use a unique file name for each part
                let file = await svc.files.upload(`${fileName}_${i + 1}.zip`, content);
                files.push(file);
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
