import expressLoader from './express.js';
import colors from 'colors';
import Logger from '../helpers/logger.js';

export default async (app) => {
    try {
        // Load Express
        await expressLoader(app);
        Logger.info(colors.cyan('✓ All loaders initialized successfully'));
    } catch (error) {
        Logger.error(colors.red('Error initializing loaders:'), error);
        throw error;
    }
};