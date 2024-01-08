import { expect } from 'chai';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { assert, spy } from 'sinon';
import { Container } from 'typedi';
import { DatabaseService } from './database.service';

describe('Database tests', () => {
    let dbService: DatabaseService;
    let mongoServer: MongoMemoryServer;
    let uri = '';
    beforeEach(async () => {
        dbService = Container.get(DatabaseService);
        mongoServer = await MongoMemoryServer.create();
        uri = mongoServer.getUri();
    });

    afterEach(() => {
        dbService.client.close();
        mongoServer.stop();
    });

    it('should connect to the database', async () => {
        await dbService.connectToServer(uri);
        expect(dbService.client).not.to.equal(undefined);
    });

    it('should not connect to the database with invalid URI', async () => {
        const consoleSpy = spy(console, 'error');
        await dbService.connectToServer('bad-uri');
        assert.calledOnce(consoleSpy);
    });
});
