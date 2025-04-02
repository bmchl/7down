import { Injectable } from '@angular/core';
import { get, getDatabase, ref, set } from 'firebase/database';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    uid: string = '';
    language: string = '';

    constructor() {}

    setUID(uid: string) {
        this.uid = uid;
    }

    getUID(): string {
        return this.uid;
    }

    async getLanguage(uid: string | null): Promise<string> {
        try {
            const db = getDatabase();
            const userLanguageRef = ref(db, `users/${uid}/language`);
            const snapshot = await get(userLanguageRef);
            console.log('language', snapshot.val(), uid);
            if (snapshot.exists()) {
                this.language = snapshot.val();
                return this.language;
            } else {
                console.log('User language not found.');
                return '';
            }
        } catch (error) {
            console.error('Error fetching user language:', error);
            return '';
        }
    }

    async incrementLoginCount(uid: string) {
        const db = getDatabase();
        const loginCountRef = ref(db, `users/${uid}/loginCount`);
        await get(loginCountRef).then((snapshot) => {
            const currentCount = snapshot.exists() ? snapshot.val() : 0;
            set(loginCountRef, currentCount + 1);
        });
    }

    async incrementLogoutCount(uid: string) {
        const db = getDatabase();
        const logoutCountRef = ref(db, `users/${uid}/logoutCount`);
        await get(logoutCountRef).then((snapshot) => {
            const currentCount = snapshot.exists() ? snapshot.val() : 0;
            set(logoutCountRef, currentCount + 1);
        });
    }
}
