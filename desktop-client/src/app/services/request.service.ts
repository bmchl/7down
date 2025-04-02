import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class RequestService {
    constructor(private http: HttpClient) {}

    getRequest(endpoint: string) {
        return this.http.get(`${environment.serverUrl}/api/${endpoint}`);
    }
    postRequest(endpoint: string, body: object) {
        return this.http.post(`${environment.serverUrl}/api/${endpoint}`, body, { observe: 'response' });
    }
    deleteRequest(endpoint: string) {
        return this.http.delete(`${environment.serverUrl}/api/${endpoint}`, { observe: 'response' });
    }
    patchRequest(endpoint: string, body: object) {
        return this.http.patch(`${environment.serverUrl}/api/${endpoint}`, body);
    }
    putRequest(endpoint: string, body: object) {
        return this.http.put(`${environment.serverUrl}/api/${endpoint}`, body);
    }
}
