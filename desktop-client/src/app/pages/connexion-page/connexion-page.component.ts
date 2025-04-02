import { DOCUMENT } from '@angular/common';
import { Component, HostListener, Inject, OnInit, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@app/services/auth-service';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { get, getDatabase, ref, set } from 'firebase/database';
import { authen } from 'firebase/firebaseConfig';
import { SocketClientService } from 'src/app/services/socket-client.service';
//import { Component, Inject, Renderer2 } from '@angular/core';

@Component({
    selector: 'app-connexion-page',
    templateUrl: './connexion-page.component.html',
    styleUrls: ['./connexion-page.component.scss'],
})
export class ConnexionPageComponent implements OnInit {
    email: string = '';
    password: string = '';
    username: string = '';
    errorMessage: string = '';
    isDarkMode: boolean = false;
    hide = true;

    constructor(
        private router: Router,
        public socketClientService: SocketClientService,
        public authService: AuthService,
        private renderer: Renderer2,
        @Inject(DOCUMENT) private document: Document,
    ) {}

    async ngOnInit(): Promise<void> {
        await this.socketClientService.connect();
    }

    toggleDarkMode(): void {
        this.isDarkMode = !this.isDarkMode;
        if (this.isDarkMode) {
            this.renderer.addClass(this.document.body, 'dark');
        } else {
            this.renderer.removeClass(this.document.body, 'dark');
        }
    }

    @HostListener('window:unload', ['$event'])
    beforeunloadHandler(event: any) {
        sessionStorage.setItem('user_uid', '');
    }

    login() {
        if (!this.email || !this.password) {
            this.errorMessage = 'Please fill in all fields.';
            return;
        }
        signInWithEmailAndPassword(authen, this.email, this.password)
            .then((userCredential) => {
                this.authService.setUID(userCredential.user.uid);
                const db = getDatabase();
                const userRef = ref(db, `users/${userCredential.user.uid}`);

                get(userRef)
                    .then((snapshot) => {
                        const userData = snapshot.val();
                        if (userData && userData.isLoggedIn) {
                            sessionStorage.setItem('failed_login', 'true');
                            this.errorMessage = 'Another user is already logged in with this account.';
                            return;
                        }

                        if (userData && userData.password !== this.password) {
                            set(ref(db, `users/${userCredential.user.uid}/password`), this.password)
                                .then(() => {})
                                .catch((error) => {
                                    console.error('Error updating password:', error);
                                });
                        }

                        // Set isLoggedIn to true to indicate the user is logged in
                        set(ref(db, `users/${userCredential.user.uid}/isLoggedIn`), true)
                            .then(() => {
                                sessionStorage.setItem('failed_login', '');
                                this.router.navigate(['/home']);
                                this.socketClientService.disconnect();
                                this.socketClientService.connect();
                                this.authService.incrementLoginCount(userCredential.user.uid);
                            })
                            .catch((error) => {
                                console.error(error);
                                this.errorMessage = 'Error updating user status. Please try again later.';
                            });
                    })
                    .catch((error: any) => {
                        console.error(error);
                        this.errorMessage = 'Error checking user status. Please try again later.';
                    });
            })
            .catch((error) => {
                this.errorMessage = 'Account connection failed. Please try again later.';
            });
    }
}
