/* eslint-disable @typescript-eslint/naming-convention */
const PORT = 3000;
const DB_NAME = '7down';
const DB_COLLECTION_GAMES = 'games';
const DB_COLLECTION_MATCHES = 'matches';
const DB_COLLECTION_SETTINGS = 'settings';
const DB_COLLECTION_USERS = 'users';

const DB_URL = 'mongodb+srv://root:abcde12345@cluster0.lvlzg3x.mongodb.net/?retryWrites=true&w=majority';

export const DB_CONSTS = {
    DB_NAME,
    DB_COLLECTION_GAMES,
    DB_URL,
    DB_COLLECTION_MATCHES,
    DB_COLLECTION_SETTINGS,
    DB_COLLECTION_USERS,
};

export { PORT };
