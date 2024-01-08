import { Application } from '@app/app';
import { GamesService } from '@app/services/games.service';
import { Message } from '@common/message';
import * as chai from 'chai';
import { expect } from 'chai';
import { StatusCodes } from 'http-status-codes';
import { createStubInstance, SinonStubbedInstance } from 'sinon';
import * as supertest from 'supertest';
import { Container } from 'typedi';

describe('GamesController', () => {
    let gameSevice: SinonStubbedInstance<GamesService>;
    let expressApp: Express.Application;

    beforeEach(async () => {
        gameSevice = createStubInstance(GamesService);
        const app = Container.get(Application);
        // eslint-disable-next-line dot-notation
        Object.defineProperty(app['gamesController'], 'gamesService', { value: gameSevice, writable: true });
        expressApp = app.app;
    });

    it('should return all games', async () => {
        const games = [
            { id: '1', name: 'game1' },
            { id: '2', name: 'game2' },
        ];
        gameSevice.getAllGames.resolves(games);
        return supertest(expressApp)
            .get('/api/games')
            .expect(200)
            .then((response) => {
                expect(response.status).to.equal(StatusCodes.OK);
                expect(response.body).to.deep.equal(games);
            });
    });

    it('should return 500 if gamesService.getAllGames throws an error', async () => {
        gameSevice.getAllGames.rejects(new Error('error'));
        return supertest(expressApp)
            .get('/api/games')
            .expect(500)
            .catch((err) => {
                chai.expect(err.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
            });
    });

    it('should return a game by id', async () => {
        const game = { id: '1', name: 'game1' };
        gameSevice.getGameById.resolves(game);
        return supertest(expressApp)
            .get('/api/games/1')
            .expect(200)
            .expect(game)
            .then((response) => {
                chai.assert.equal(response.status, StatusCodes.OK);
                expect(response.status).to.equal(StatusCodes.OK);
                expect(response.body).to.deep.equal(game);
            });
    });

    it('should send a 404 if the game searched by id is not found', async () => {
        gameSevice.getGameById.resolves(undefined);
        return supertest(expressApp)
            .get('/api/games/1')
            .expect(404)
            .then((response) => {
                chai.assert.equal(response.status, StatusCodes.NOT_FOUND);
                expect(response.status).to.equal(StatusCodes.NOT_FOUND);
            });
    });

    it('should send a 500 if gamesService.getGameById throws an error', async () => {
        gameSevice.getGameById.rejects(new Error('error'));
        return supertest(expressApp)
            .get('/api/games/1')
            .expect(500)
            .then((response) => {
                chai.assert.equal(response.status, StatusCodes.INTERNAL_SERVER_ERROR);
                expect(response.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
            });
    });

    it('should create a game', async () => {
        const game = {
            id: '1',
            name: 'game1',
            gameName: '',
            image: '',
            image1: '',
            imageDifference: [[[0, 0, 0]]],
            difficulty: 0,
            differenceCount: 0,
            penalty: 0,
            soloLeaderboard: [{ name: 'name', time: 0 }],
            multiLeaderboard: [{ name: 'name', time: 0 }],
        };
        const message: Message = { title: 'Hello', body: 'World' };

        gameSevice.createGame.resolves(game);
        return supertest(expressApp)
            .post('/api/games')
            .send(message)
            .expect(201)
            .expect(game)
            .then((response) => {
                expect(response.status).to.equal(StatusCodes.CREATED);
                expect(response.body).to.deep.equal(game);
            });
    });

    it('should send a 500 if gamesService.createGame throws an error', async () => {
        gameSevice.createGame.rejects(new Error('error'));
        const message: Message = { title: 'Hello', body: 'World' };

        return supertest(expressApp)
            .post('/api/games')
            .send(message)
            .expect(500)
            .then((response) => {
                chai.assert.equal(response.status, StatusCodes.INTERNAL_SERVER_ERROR);
                expect(response.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
            });
    });

    it('should send a 400 if there is no body for a post', async () => {
        gameSevice.createGame.rejects(new Error('error'));
        return supertest(expressApp)
            .post('/api/games')
            .expect(400)
            .then((response) => {
                chai.assert.equal(response.status, StatusCodes.BAD_REQUEST);
                expect(response.status).to.equal(StatusCodes.BAD_REQUEST);
            });
    });

    it('should send a 400 if there is no body for a post', async () => {
        gameSevice.createGame.rejects(new Error('error'));
        return supertest(expressApp)
            .post('/api/games')
            .expect(400)
            .then((response) => {
                chai.assert.equal(response.status, StatusCodes.BAD_REQUEST);
                expect(response.status).to.equal(StatusCodes.BAD_REQUEST);
            });
    });

    it('should send a 400 if there is no body for a post', async () => {
        gameSevice.createGame.rejects(new Error('error'));
        return supertest(expressApp)
            .post('/api/games')
            .expect(400)
            .then((response) => {
                chai.assert.equal(response.status, StatusCodes.BAD_REQUEST);
                expect(response.status).to.equal(StatusCodes.BAD_REQUEST);
            });
    });

    it('should send a 400 if there is no body for a post', async () => {
        gameSevice.createGame.rejects(new Error('error'));
        return supertest(expressApp)
            .post('/api/games')
            .expect(400)
            .then((response) => {
                chai.assert.equal(response.status, StatusCodes.BAD_REQUEST);
                expect(response.status).to.equal(StatusCodes.BAD_REQUEST);
            });
    });

    it('should delete a game', async () => {
        gameSevice.deleteGame.resolves(true);
        return supertest(expressApp)
            .delete('/api/games/1')
            .expect(200)
            .then((response) => {
                expect(response.status).to.equal(StatusCodes.OK);
                expect(response.body).to.deep.equal({ message: 'Game deleted' });
            });
    });

    it('should send a 404 if the game is not found when deleting', async () => {
        gameSevice.deleteGame.resolves(false);
        return supertest(expressApp)
            .delete('/api/games/1')
            .expect(404)
            .then((response) => {
                expect(response.status).to.equal(StatusCodes.NOT_FOUND);
                expect(response.body).to.deep.equal({ message: 'Game not found' });
            });
    });

    it('should send a 500 if gamesService.deleteGame throws an error', async () => {
        gameSevice.deleteGame.rejects(new Error('error'));
        return supertest(expressApp)
            .delete('/api/games/1')
            .expect(500)
            .then((response) => {
                chai.assert.equal(response.status, StatusCodes.INTERNAL_SERVER_ERROR);
                expect(response.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
            });
    });

    it('patch should send a 200 if valid request', async () => {
        gameSevice.updateGame.resolves(true);
        return supertest(expressApp).patch('/api/games/1').expect(StatusCodes.OK);
    });

    it('patch should send a 404 if game not found', async () => {
        return supertest(expressApp).patch('/api/games/invalidIdcode123').expect(StatusCodes.NOT_FOUND);
    });

    it('patch should send a 500 if server error on validate', async () => {
        gameSevice.updateGame.rejects(new Error('error'));
        return supertest(expressApp).patch('/api/games/1').expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it('should return current consts params', async () => {
        gameSevice.getConsts.resolves({ penalty: 0 });
        return supertest(expressApp)
            .get('/api/games/consts')
            .expect(200)
            .then((response) => {
                chai.assert.equal(response.status, StatusCodes.OK);
                expect(response.status).to.equal(StatusCodes.OK);
                expect(response.body).to.deep.equal({ penalty: 0 });
            });
    });

    it('should have status 500 when error on get consts params', async () => {
        gameSevice.getConsts.rejects();
        return supertest(expressApp).get('/api/games/consts').expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it('should update the current consts params', async () => {
        gameSevice.updateConsts.resolves(true);
        return supertest(expressApp)
            .put('/api/games/consts')
            .expect(200)
            .then((response) => {
                chai.assert.equal(response.status, StatusCodes.OK);
                expect(response.status).to.equal(StatusCodes.OK);
            });
    });

    it('should have status 500 when error on get consts params', async () => {
        gameSevice.updateConsts.rejects();
        return supertest(expressApp).put('/api/games/consts').expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it('should return all history', async () => {
        gameSevice.getHistory.resolves();
        return supertest(expressApp)
            .get('/api/games/history')
            .expect(200)
            .then((response) => {
                chai.assert.equal(response.status, StatusCodes.OK);
                expect(response.status).to.equal(StatusCodes.OK);
            });
    });

    it('should send a 500 if gamesService.getHistory() throws an error', async () => {
        gameSevice.getHistory.rejects(new Error('error'));
        return supertest(expressApp)
            .get('/api/games/history')
            .expect(500)
            .then((response) => {
                chai.assert.equal(response.status, StatusCodes.INTERNAL_SERVER_ERROR);
                expect(response.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
            });
    });

    it('should delete the history', async () => {
        gameSevice.deleteHistory.resolves(true);
        return supertest(expressApp)
            .delete('/api/games/history')
            .expect(200)
            .then((response) => {
                expect(response.status).to.equal(StatusCodes.OK);
                expect(response.body).to.deep.equal({ message: 'true history records deleted' });
            });
    });

    it('should send a 404 if the history is not found when deleting', async () => {
        gameSevice.deleteHistory.resolves(false);
        return supertest(expressApp)
            .delete('/api/games/history')
            .expect(404)
            .then((response) => {
                expect(response.status).to.equal(StatusCodes.NOT_FOUND);
                expect(response.body).to.deep.equal({ message: 'No history found' });
            });
    });

    it('should send a 500 if gamesService.deleteHistory() throws an error', async () => {
        gameSevice.deleteHistory.rejects(new Error('error'));
        return supertest(expressApp)
            .delete('/api/games/history')
            .expect(500)
            .then((response) => {
                chai.assert.equal(response.status, StatusCodes.INTERNAL_SERVER_ERROR);
                expect(response.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
            });
    });
});
