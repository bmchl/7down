import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppMaterialModule } from '@app/modules/material.module';
import { environment } from 'src/environments/environment';
import { RequestService } from './request.service';

describe('RequestService', () => {
    let service: RequestService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, AppMaterialModule],
            providers: [RequestService],
        });

        service = TestBed.inject(RequestService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should make a POST request to the correct endpoint', () => {
        const endpoint = 'test-endpoint';
        const body = { data: 'test-data' };
        const expectedUrl = `${environment.serverUrl}/api/${endpoint}`;
        const expectedResponse = { data: 'test-response' };

        service.postRequest(endpoint, body).subscribe((response) => {
            expect(response.body).toEqual(expectedResponse);
        });

        const request = httpMock.expectOne(expectedUrl);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual(body);
        request.flush(expectedResponse);
    });

    it('should make a delete request to the correct endpoint', () => {
        const endpoint = 'test1-endpoint';
        const expectedUrl = `${environment.serverUrl}/api/${endpoint}`;
        service.putRequest(endpoint, {}).subscribe();
        const request = httpMock.expectOne(expectedUrl);
        expect(request.request.method).toBe('PUT');
    });

    it('should make a delete request to the correct endpoint', () => {
        const endpoint = 'test2-endpoint';
        const expectedUrl = `${environment.serverUrl}/api/${endpoint}`;
        service.deleteRequest(endpoint).subscribe();
        const request = httpMock.expectOne(expectedUrl);
        expect(request.request.method).toBe('DELETE');
    });

    it('patchRequest should make a patch request to the correct endpoint', () => {
        const endpoint = 'test3-endpoint';
        const body = { data: 'test-data' };
        const expectedUrl = `${environment.serverUrl}/api/${endpoint}`;
        const expectedResponse = { data: 'test-response' };

        service.patchRequest(endpoint, body).subscribe((response) => {
            expect(response).toEqual(expectedResponse);
        });

        const request = httpMock.expectOne(expectedUrl);
        expect(request.request.method).toBe('PATCH');
        expect(request.request.body).toEqual(body);
        request.flush(expectedResponse);
    });
});
