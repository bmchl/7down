import { FindDifferences } from '@app/classes/diff.interface';
import { DiffService } from '@app/services/diff.service';
import { Request, Response, Router } from 'express';
import { Service } from 'typedi';
import { StatusCodes } from 'http-status-codes';

const HTTP_STATUS_CREATED = StatusCodes.CREATED;

@Service()
export class DiffController {
    router: Router;

    constructor(private readonly diffService: DiffService) {
        this.configureRouter();
    }

    private configureRouter(): void {
        this.router = Router();
        /**
         * @swagger
         *
         * definitions:
         *   Message:
         *     type: object
         *     properties:
         *       title:
         *         type: string
         *       body:
         *         type: string
         */

        /**
         * @swagger
         * tags:
         *   - name: Example
         *     description: Default cadriciel endpoint
         *   - name: Message
         *     description: Messages functions
         */

        /**
         * @swagger
         *
         * /api/example/send:
         *   post:
         *     description: Send a message
         *     tags:
         *       - Example
         *       - Message
         *     requestBody:
         *         description: message object
         *         required: true
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/definitions/Message'
         *             example:
         *               title: Mon Message
         *               body: Je suis envoyé à partir de la documentation!
         *     produces:
         *       - application/json
         *     responses:
         *       201:
         *         description: Created
         */
        this.router.post('/find-differences', async (req: Request, res: Response) => {
            const input: FindDifferences = req.body;
            const output = await this.diffService.findDifferences(input.img0, input.img1, input.radius);
            res.status(HTTP_STATUS_CREATED).json(output);
        });
    }
}
