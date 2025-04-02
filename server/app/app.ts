/* eslint-disable prettier/prettier */
import { HttpException } from '@app/classes/http.exception';
import { DiffController } from '@app/controllers/diff.controller';
import { FirebaseController } from '@app/controllers/firebase.controller';
import { GamesController } from '@app/controllers/games.controller';
import { UserController } from '@app/controllers/user.controller';
import * as cookieParser from 'cookie-parser';
import * as cors from 'cors';
import * as express from 'express';
import { StatusCodes } from 'http-status-codes';
import * as swaggerJSDoc from 'swagger-jsdoc';
import * as swaggerUi from 'swagger-ui-express';
import { Service } from 'typedi';

@Service()
export class Application {
    app: express.Application;
    private readonly internalError: number;
    private readonly swaggerOptions: swaggerJSDoc.Options;

    // eslint-disable-next-line max-params
    constructor(
        private readonly diffController: DiffController,
        private readonly gamesController: GamesController,
        private readonly userController: UserController,
        private readonly firebaseController: FirebaseController
    ) {
        this.app = express();

        this.internalError = StatusCodes.INTERNAL_SERVER_ERROR;

        this.swaggerOptions = {
            swaggerDefinition: {
                openapi: '3.0.0',
                info: {
                    title: 'Cadriciel Serveur',
                    version: '1.0.0',
                },
            },
            apis: ['**/*.ts'],
        };

        this.config();

        this.bindRoutes();
    }

    bindRoutes(): void {
        this.app.use(
            '/api/docs',
            swaggerUi.serve,
            swaggerUi.setup(swaggerJSDoc(this.swaggerOptions))
        );
        this.app.use('/api/diff', this.diffController.router);
        this.app.use('/api/games', this.gamesController.router);
        this.app.use('/api/user', this.userController.router);
        this.app.use('/api/firebase', this.firebaseController.router);
        this.app.use('/', (req, res) => {
            res.redirect('/api/docs');
        });
        this.errorHandling();
    }

    private config(): void {
        // Middlewares configuration
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ limit: '50mb', extended: true }));
        this.app.use(cookieParser());
        this.app.use(cors());
        this.app.use('/assets', express.static('./assets'));
    }

    private errorHandling(): void {
        // When previous handlers have not served a request: path wasn't found
        this.app.use(
            (
                req: express.Request,
                res: express.Response,
                next: express.NextFunction
            ) => {
                const err: HttpException = new HttpException('Not Found');
                next(err);
            }
        );

        // development error handler
        // will print stacktrace
        if (this.app.get('env') === 'development') {
            this.app.use(
                (
                    err: HttpException,
                    req: express.Request,
                    res: express.Response
                ) => {
                    res.status(err.status || this.internalError);
                    res.send({
                        message: err.message,
                        error: err,
                    });
                }
            );
        }

        // production error handler
        // no stacktraces  leaked to user (in production env only)
        this.app.use(
            (
                err: HttpException,
                req: express.Request,
                res: express.Response
            ) => {
                res.status(err.status || this.internalError);
                res.send({
                    message: err.message,
                    error: {},
                });
            }
        );
    }
}
