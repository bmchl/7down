import { MongoClient } from 'mongodb';
import { Service } from 'typedi';
import { DB_CONSTS } from './../utils/env';

@Service()
export class DatabaseService {
    uri: any;
    client: any;
    db: any;

    async connectToServer(uri: any) {
        try {
            this.client = new MongoClient(uri);
            await this.client.connect();
            this.db = this.client.db(DB_CONSTS.DB_NAME);
            // eslint-disable-next-line no-console
            console.log('Successfully connected to MongoDB.');
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err);
        }
    }
}
