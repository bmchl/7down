import { Injectable } from '@angular/core';

import { get, getDatabase, ref } from 'firebase/database';
import { Socket, io } from 'socket.io-client';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth-service';

@Injectable({
    providedIn: 'root',
})
export class SocketClientService {
    socket: Socket;
    gameRoomId: string = Date.now().toString();
    isConnecting: boolean = false;
    id: string;

    constructor(private authService: AuthService) {} // Inject AuthService

    isSocketAlive() {
        return this.socket && this.socket.connected;
    }

    async connect() {
        let uid = '';
        if (!sessionStorage.getItem('user_uid')) {
            uid = this.authService.getUID();
            sessionStorage.setItem('user_uid', uid);
        } else {
            uid = sessionStorage.getItem('user_uid') ?? '';
        }
        try {
            if (!this.isSocketAlive() && !this.isConnecting) {
                // get username from database
                const db = getDatabase();
                const userLanguageRef = ref(db, `users/${uid}`);
                const snapshot = await get(userLanguageRef);

                console.log('USERNAME', snapshot.val(), uid);
                console.log('SOCKET UID:', uid);
                this.socket = io(environment.serverUrl, {
                    query: {
                        uid: uid,
                        username: snapshot.exists() ? snapshot.val().username : uid,
                        profilePic: snapshot.exists() ? snapshot.val().avatarUrl : '',
                    },
                    transports: ['websocket'],
                    upgrade: false,
                });
                this.isConnecting = true;
                this.on('connect', () => {
                    console.log('ad');
                    this.isConnecting = false;
                    this.id = this.socket?.id ?? '';
                });
            }
        } catch (e) {
            this.isConnecting = false;
        }
    }

    disconnect() {
        this.socket.disconnect();
    }

    removeAllListeners() {
        if (this.isSocketAlive()) this.socket.removeAllListeners();
    }

    on<T>(event: string, action: (data: T) => void): void {
        this.socket.on(event, action);
    }

    off<T>(event: string, action: (data: T) => void): void {
        this.socket.off(event, action);
    }

    send<T>(event: string, data?: T): void {
        if (data) {
            this.socket.emit(event, data);
        } else {
            this.socket.emit(event);
        }
    }
}
