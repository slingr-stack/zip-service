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

svc.functions.zipFilesSafe = async (req) => {
    zipFilesSafe(req);
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
