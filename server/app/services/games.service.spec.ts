/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { CreateGame, Game, Match } from '@common/game';
import { expect } from 'chai';
import * as fs from 'fs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createSandbox, SinonSandbox } from 'sinon';
import { Container } from 'typedi';
import { DB_CONSTS } from './../utils/env';
import { DatabaseService } from './database.service';
import { DiffService } from './diff.service';
import { GamesService } from './games.service';

describe('GamesService', () => {
    let mongoServer: MongoMemoryServer;
    let sandbox: SinonSandbox;
    let gamesService: GamesService;
    let diffService: DiffService;
    let databaseService: DatabaseService;
    const img0 =
        // base64 encoded images require extra line space & we need a 640x480 image for game creation
        // eslint-disable-next-line max-len
    const img1 =
        // eslint-disable-next-line max-len
    const gameInfo: CreateGame = { gameName: 'Test Game2', image: img0, image1: img1, radius: 3 };

    beforeEach(async () => {
        diffService = Container.get(DiffService);
        databaseService = Container.get(DatabaseService);
        mongoServer = await MongoMemoryServer.create();
        await databaseService.connectToServer(mongoServer.getUri());
        await databaseService.db.createCollection(DB_CONSTS.DB_COLLECTION_GAMES);
        await databaseService.db.createCollection(DB_CONSTS.DB_COLLECTION_MATCHES);
        const game: Game = {
            id: 'cea1068e-a358-41ad-8e44-d3d707eeef0a',
            gameName: gameInfo.gameName,
            image: '/assets/cea1068e-a358-41ad-8e44-d3d707eeef0a-0.bmp',
            image1: '/assets/cea1068e-a358-41ad-8e44-d3d707eeef0a-1.bmp',
            imageDifference: [
                [
                    [10, 11],
                    [10, 12],
                ],
                [
                    [14, 14],
                    [14, 15],
                ],
            ],
            difficulty: 0,
            differenceCount: 2,
            penalty: 5,
            soloLeaderboard: [
                { playerName: 'Lorem', recordTime: 213 },
                { playerName: 'Ipsum', recordTime: 581 },
                { playerName: 'Dolor', recordTime: 609 },
            ],
            multiLeaderboard: [
                { playerName: 'Lorem', recordTime: 213 },
                { playerName: 'Ipsum', recordTime: 581 },
                { playerName: 'Dolor', recordTime: 609 },
            ],
        };
        await databaseService.db.collection(DB_CONSTS.DB_COLLECTION_GAMES).insertOne(game);
        const multiMatch: Match = {
            id: '1234',
            gameId: 'cea1068e-a358-41ad-8e44-d3d707eeef0a',
            player0: 'p0',
            player1: 'p1',
            startDate: 0,
            multiplayer: false,
            timeLimit: false,
            winner: '',
            completionTime: 0,
        };
        const soloMatch: Match = {
            id: '1111',
            gameId: 'cea1068e-a358-41ad-8e44-d3d707eeef0a',
            player0: 'p0',
            player1: 'N/A',
            startDate: 0,
            multiplayer: false,
            timeLimit: false,
            winner: '',
            completionTime: 0,
        };
        await databaseService.db.collection(DB_CONSTS.DB_COLLECTION_MATCHES).insertOne(multiMatch);
        await databaseService.db.collection(DB_CONSTS.DB_COLLECTION_MATCHES).insertOne(soloMatch);
        await databaseService.db.collection(DB_CONSTS.DB_COLLECTION_SETTINGS).insertOne({ initialTime: 30, penalty: 5, timeGainPerDiff: 5 });
        gamesService = new GamesService(databaseService, diffService);
        sandbox = createSandbox();
    });

    afterEach(() => {
        databaseService.client.close();
        mongoServer.stop();
        sandbox.restore();
    });

    it('getAllGames should return an array of games', async () => {
        const res = await gamesService.getAllGames();
        expect(Array.isArray(res)).to.be.true;
    });

    it('getAllGames should return an array of games', async () => {
        sandbox.stub(gamesService.dbService.db, 'collection').throws('error');
        const res = await gamesService.getAllGames();
        expect(res).to.deep.equal([]);
    });

    it('getGameById should return the game id', async () => {
        const gameId = 'cea1068e-a358-41ad-8e44-d3d707eeef0a';
        const game = await gamesService.getGameById(gameId);
        expect(game.id).to.equal(gameId);
    });

    it('should create a new game and return the game object', async () => {
        const expectedLeaderboard = [
            { playerName: 'Lorem', recordTime: 213 },
            { playerName: 'Ipsum', recordTime: 581 },
            { playerName: 'Dolor', recordTime: 609 },
        ];
        sandbox.stub(gamesService.diffService, 'saveImages').callsFake(async () => true);
        const game = await gamesService.createGame(gameInfo);
        if (!game) {
            throw new Error('Game could not be created');
        }
        expect(game).to.exist;
        expect(game.gameName).to.equal(gameInfo.gameName);
        expect(game.image).to.equal(`/assets/${game.id}-0.bmp`);
        expect(game.image1).to.equal(`/assets/${game.id}-1.bmp`);
        expect(game.difficulty).to.equal(10);
        expect(game.differenceCount).to.equal(7);
        expect(game.penalty).to.equal(5);
        expect(game.soloLeaderboard).to.deep.equal(expectedLeaderboard);
        expect(game.multiLeaderboard).to.deep.equal(expectedLeaderboard);
    });

    it('createGame() if diff count is 3 then diff should be 0', async () => {
        sandbox.stub(gamesService.diffService, 'findDifferences').callsFake(async () => [[[0, 0]], [[0, 0]], [[0, 0]]]);
        sandbox.stub(gamesService.diffService, 'saveImages').callsFake(async () => true);
        const game = await gamesService.createGame(gameInfo);
        expect(game?.difficulty).to.equal(0);
    });

    it('createGame() if invalid diff count < 3 return undefiend', async () => {
        sandbox.stub(gamesService.diffService, 'findDifferences').callsFake(async () => [[[0, 0]], [[0, 0]]]);
        const game = await gamesService.createGame(gameInfo);
        expect(game).to.be.undefined;
    });

    it('createGame() if invalid diff count > 9 return undefiend', async () => {
        sandbox
            .stub(gamesService.diffService, 'findDifferences')
            .callsFake(async () => [
                [[0, 0]],
                [[0, 0]],
                [[0, 0]],
                [[0, 0]],
                [[0, 0]],
                [[0, 0]],
                [[0, 0]],
                [[0, 0]],
                [[0, 0]],
                [[0, 0]],
                [[0, 0]],
                [[0, 0]],
                [[0, 0]],
            ]);
        const game = await gamesService.createGame(gameInfo);
        expect(game).to.be.undefined;
    });

    it('createGame() if save images fails return undefined', async () => {
        sandbox.stub(gamesService.diffService, 'saveImages').callsFake(async () => false);
        const game = await gamesService.createGame(gameInfo);
        expect(game).to.be.undefined;
    });

    it('deteleGame() should delete a game by its id', async () => {
        const gameId = 'cea1068e-a358-41ad-8e44-d3d707eeef0a';
        const unlinkFake = sandbox.fake();
        sandbox.replace(fs, 'unlinkSync', unlinkFake);
        const result = await gamesService.deleteGame(gameId);
        expect(result).to.be.true;
        const game = await gamesService.getGameById(gameId);
        expect(game).to.be.null;
    });

    it('deteleGame() should delete a game by its id', async () => {
        const gameId = 'cea1068e-a358-41ad-8e44-d3d707eeef0a';
        const unlinkFake = sandbox.fake();
        const existFake = sandbox.stub(() => true);
        sandbox.replace(fs, 'unlinkSync', unlinkFake);
        sandbox.replace(fs, 'existsSync', existFake);
        const result = await gamesService.deleteGame(gameId);
        expect(result).to.be.true;
        const game = await gamesService.getGameById(gameId);
        expect(game).to.be.null;
    });

    it('deleteGame() should return null if game with the id does not exist', async () => {
        const gameId = 'guifd';
        const result = await gamesService.deleteGame(gameId);
        expect(result).to.be.false;
    });

    it('validateCoords() should return the clicked array index', async () => {
        const arr = await gamesService.validateCoords({
            differences: [
                [
                    [10, 11],
                    [10, 12],
                ],
                [
                    [14, 14],
                    [14, 15],
                ],
            ],
            x: 10,
            y: 11,
            found: [],
        });
        expect(arr).to.equal(0);
    });

    it('validateCoords() should return undefiend if wrong click', async () => {
        const arr = await gamesService.validateCoords({
            differences: [
                [
                    [10, 11],
                    [10, 12],
                ],
                [
                    [14, 14],
                    [14, 15],
                ],
            ],
            x: 16,
            y: 16,
            found: [],
        });
        expect(arr).to.equal(-1);
    });

    it('validateCoords() return undefined if game id not found', async () => {
        sandbox.stub(gamesService.dbService.db, 'collection').throws('error');
        const arr = await gamesService.validateCoords({
            differences: [
                [
                    [10, 11],
                    [10, 12],
                ],
                [
                    [14, 14],
                    [14, 15],
                ],
            ],
            x: 16,
            y: 16,
            found: [],
        });
        expect(arr).to.equal(-1);
    });

    it('updateGame() should update the game', async () => {
        const game = await gamesService.updateGame('cea1068e-a358-41ad-8e44-d3d707eeef0a', {
            gameName: 'new game name',
            difficulty: 10,
            differenceCount: 7,
            penalty: 5,
        });
        expect(game?.gameName).to.equal(undefined);
    });

    it('updateGame() should return false if game not found', async () => {
        const game = await gamesService.updateGame('guifd', {
            gameName: 'new game name',
            difficulty: 10,
            differenceCount: 7,
            penalty: 5,
        });
        expect(game).to.be.false;
    });

    it('updateLeaderboard() should return the correct index for a new solo record', async () => {
        const result = await gamesService.updateLeaderboard('1234', 20000);
        expect(result).to.equal(1);
    });
    it('updateLeaderboard() should return the correct index for a new multiplayer record', async () => {
        const result = await gamesService.updateLeaderboard('1111', 20000);
        expect(result).to.equal(1);
    });
    it('updateLeaderboard() should return false if no new record', async () => {
        const result = await gamesService.updateLeaderboard('1234', 2000000);
        expect(result).to.be.false;
    });
    it('updateLeaderboard() should return false if no new record', async () => {
        const result = await gamesService.updateLeaderboard('1234', 213000);
        expect(result).to.be.false;
    });
    it('updateConsts should update consts', async () => {
        await gamesService.updateConsts(0, 0, 0);
        const params = await gamesService.getConsts();
        expect(params.penalty).to.equal(0);
    });

    it('getConsts should get consts', async () => {
        const params = await gamesService.getConsts();
        expect(params.penalty).to.equal(5);
    });

    it('getHistory should return an array of the games already played', async () => {
        const res = await gamesService.getHistory();
        expect(res[0].player1).to.equal('p1');
        expect(res[1].player1).to.equal('N/A');
    });

    it('deleteHistory() should delete the entire history', async () => {
        const unlinkFake = sandbox.fake();
        sandbox.replace(fs, 'unlinkSync', unlinkFake);
        const result = await gamesService.deleteHistory();
        expect(result).to.equal(2);
    });

    it('getHistory() should return false if the history does not exist', async () => {
        await databaseService.db.collection(DB_CONSTS.DB_COLLECTION_MATCHES).deleteMany({});
        const result = await gamesService.getHistory();
        expect(result).to.deep.equal([]);
    });
});