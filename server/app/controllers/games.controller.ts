/* eslint-disable radix */
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Service } from 'typedi';
import { CreateGame, Game } from './../../../common/game';
import { GamesService } from './../services/games.service';

@Service()
export class GamesController {
    router: Router;

    constructor(private gamesService: GamesService) {
        this.configureRouter();
    }

    private configureRouter(): void {
        this.router = Router();

        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const allGames = await this.gamesService.getAllGames();
                res.json(allGames);
            } catch (error) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Internal server error');
            }
        });

        this.router.get('/consts', async (req: Request, res: Response) => {
            try {
                const consts = await this.gamesService.getConsts();
                res.json(consts);
            } catch (error) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
            }
        });

        this.router.get('/history', async (req: Request, res: Response) => {
            try {
                const allGameHistory = await this.gamesService.getHistory();
                res.json(allGameHistory);
            } catch (error) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
            }
        });

        this.router.get('/:id', async (req: Request, res: Response) => {
            try {
                const game: Game = await this.gamesService.getGameById(req.params.id);
                if (game) {
                    res.json(game);
                } else {
                    res.status(StatusCodes.NOT_FOUND).send('Game not found');
                }
            } catch (error) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Internal server error');
            }
        });

        this.router.post('/', async (request: Request, response: Response) => {
            try {
                if (!Object.keys(request.body).length) {
                    response.status(StatusCodes.BAD_REQUEST).send();
                    return;
                }
                const game = await this.gamesService.createGame(request.body as CreateGame);
                response.status(StatusCodes.CREATED).json(game);
            } catch (error) {
                response.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Internal server error');
            }
        });

        this.router.delete('/history', async (request: Request, response: Response) => {
            try {
                const deletedCount = await this.gamesService.deleteHistory();
                if (deletedCount) {
                    response.status(StatusCodes.OK).json({ message: `${deletedCount} history records deleted` });
                } else {
                    response.status(StatusCodes.NOT_FOUND).json({ message: 'No history found' });
                }
            } catch (error) {
                response.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
            }
        });

        this.router.delete('/:id', async (request, response) => {
            try {
                const isDeleted = await this.gamesService.deleteGame(request.params.id);
                if (isDeleted) {
                    response.status(StatusCodes.OK).json({ message: 'Game deleted' });
                } else {
                    response.status(StatusCodes.NOT_FOUND).json({ message: 'Game not found' });
                }
            } catch (error) {
                response.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Internal server error');
            }
        });

        this.router.patch('/:id', async (request, response) => {
            try {
                const game = await this.gamesService.updateGame(request.params.id, request.body);
                if (game) {
                    response.status(StatusCodes.OK).json(game);
                } else {
                    response.status(StatusCodes.NOT_FOUND).json({ message: 'Game not found' });
                }
            } catch (error) {
                response.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Internal server error');
            }
        });

        this.router.put('/consts', async (request, response) => {
            try {
                const params = await this.gamesService.updateConsts(request.body.initialTime, request.body.penalty, request.body.timeGainPerDiff);
                response.status(StatusCodes.OK).json(params);
            } catch (error) {
                response.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
            }
        });
    }
}
