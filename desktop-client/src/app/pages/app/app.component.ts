import { Component, HostListener } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { AuthService } from '@app/services/auth-service';
import { DarkModeService } from '@app/services/dark-mode.service';
import { TranslateService } from '@ngx-translate/core';
import { getDatabase, ref, set } from 'firebase/database';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    supportedLanguages = ['en', 'fr'];
    uid: string | null;

    constructor(
        private translate: TranslateService,
        private authService: AuthService,
        public router: Router,
        public darkModeService: DarkModeService,
    ) {
        // Set the default language
        this.translate.addLangs(this.supportedLanguages);
        this.translate.setDefaultLang('en');
    }

    @HostListener('window:unload', ['$event'])
    unloadHandler(event: any) {
        // Check if sessionStorage contains user_uid and the window is not being refreshed
        if (!sessionStorage.getItem('user_uid')) {
            this.uid = this.authService.getUID();
            sessionStorage.setItem('user_uid', this.uid);
        } else {
            this.uid = sessionStorage.getItem('user_uid');
        }
        // If uid is available and the window is not being refreshed, update isLoggedIn to false

        if (this.uid && !sessionStorage.getItem('failed_login')) {
            const db = getDatabase();
            const isLoggedInRef = ref(db, `users/${this.uid}/isLoggedIn`);
            set(isLoggedInRef, false)
                .then()
                .catch((error) => console.error('Error updating user status:', error));
        }
    }

    ngOnInit() {
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationStart) {
                const url = event.url;
                if (url.includes('/connexion')) {
                    const db = getDatabase();
                    if (sessionStorage.getItem('user_uid')) {
                        const isLoggedInRef = ref(db, `users/${sessionStorage.getItem('user_uid')}/isLoggedIn`);
                        set(isLoggedInRef, false)
                            .then()
                            .catch((error) => console.error('Error updating user status:', error));
                    }
                    sessionStorage.setItem('user_uid', '');
                }
            }
        });
        this.darkModeService.initializeDarkModePreference();
        if (!sessionStorage.getItem('user_uid')) {
            this.uid = this.authService.getUID();
            if (this.uid) {
                sessionStorage.setItem('user_uid', this.uid);
            }
        } else {
            this.uid = sessionStorage.getItem('user_uid');
        }
        if (this.uid && this.router.url !== '/connexion') {
            const db = getDatabase();
            const isLoggedInRef = ref(db, `users/${sessionStorage.getItem('user_uid')}/isLoggedIn`);
            set(isLoggedInRef, true)
                .then()
                .catch((error) => console.error('Error updating user status:', error));
        }
    }
}
