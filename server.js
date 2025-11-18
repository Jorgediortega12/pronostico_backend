import express from 'express';
import colors from 'colors';
import Logger from './src/helpers/logger.js';
import { name, port } from './src/config/index.js';
import loaders from './src/loaders/index.js';

async function startServer() {
    const app = express();
    await loaders(app);
    app
        .listen(port, () => {
            Logger.info(`${colors.yellow('########################################################')}
    🛡️  ${colors.green(`Server ${colors.blue(name)} listening on port:`)} ${colors.blue(port)}  🛡️
        ${colors.yellow('########################################################')}`);
        })
        .on('error', (e) => Logger.error('Error in server.listen', e));
}

startServer()
    .then(() => Logger.info(colors.green('Done ✌️')))
    .catch((error) => Logger.error(colors.red('Error when starting the API'), error));