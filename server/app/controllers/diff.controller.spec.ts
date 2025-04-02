import { Application } from '@app/app';
import { FindDifferences } from '@app/classes/diff.interface';
import { DiffService } from '@app/services/diff.service';
import { StatusCodes } from 'http-status-codes';
import { createStubInstance, SinonStubbedInstance } from 'sinon';
import * as supertest from 'supertest';
import { Container } from 'typedi';

const HTTP_STATUS_CREATED = StatusCodes.CREATED;

describe('DiffController', () => {
    let diffService: SinonStubbedInstance<DiffService>;
    let expressApp: Express.Application;

    beforeEach(async () => {
        diffService = createStubInstance(DiffService);
        const app = Container.get(Application);
        // eslint-disable-next-line dot-notation
        Object.defineProperty(app['diffController'], 'diffService', { value: diffService });
        expressApp = app.app;
    });

    it('should post message from diff service on valid post request to find-differences', async () => {
        const input: FindDifferences = { img0: 'Hello', img1: 'World', radius: 0 };
        return supertest(expressApp).post('/api/diff/find-differences').send(input).expect(HTTP_STATUS_CREATED);
    });
});
