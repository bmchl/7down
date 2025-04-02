import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Router } from '@angular/router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { equalTo, get, getDatabase, orderByChild, query, ref, set } from 'firebase/database';
import { authen } from 'firebase/firebaseConfig';
import { getDownloadURL, listAll, ref as storageRef } from 'firebase/storage';
import { RequestService } from 'src/app/services/request.service';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-create-account-page',
    templateUrl: './create-account-page.component.html',
    styleUrls: ['./create-account-page.component.scss'],
})
export class CreateAccountPageComponent implements OnInit {
    email: string = '';
    username: string = '';
    password: string = '';
    hometown: string = '';
    errorMessage: string = '';
    successMessage: string = '';
    selectedImage: string = '';
    images: any = [];
    serverPath = environment.serverUrl;
    isDarkMode: boolean = false;

    constructor(
        public requestService: RequestService,
        private router: Router,
        public storage: AngularFireStorage,
        private renderer: Renderer2,
        @Inject(DOCUMENT) private document: Document,
    ) {}

    ngOnInit(): void {
        this.fetchImages();
    }

    toggleDarkMode(): void {
        this.isDarkMode = !this.isDarkMode;
        if (this.isDarkMode) {
            this.renderer.addClass(this.document.body, 'dark');
        } else {
            this.renderer.removeClass(this.document.body, 'dark');
        }
    }

    async fetchImages() {
        try {
            const storage = this.storage.storage; // Access the Firebase Storage instance from AngularFireStorage
            const imagesRef = storageRef(storage, 'default-images');
            const imagesList = await listAll(imagesRef);
            this.images = await Promise.all(
                imagesList.items.map(async (itemRef) => {
                    const url = await getDownloadURL(itemRef);
                    return { name: itemRef.name, url: url };
                }),
            );
        } catch (error) {
            console.error('Error fetching images:', error);
        }
    }

    async getBase64ImageFromUrl(imageUrl: any) {
        var res = await fetch(imageUrl);
        var blob = await res.blob();

        return new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.addEventListener(
                'load',
                function () {
                    resolve(reader.result);
                },
                false,
            );

            reader.onerror = () => {
                return reject(this);
            };
            reader.readAsDataURL(blob);
        });
    }

    createAccount() {
        if (!this.isValidEmail(this.email)) {
            this.errorMessage = 'Please enter a valid email address.';
            return;
        }

        if (!this.username || !this.password || !this.hometown) {
            this.errorMessage = 'Please fill all the fields.';
            return;
        }

        if (this.username.length > 10) {
            this.errorMessage = 'The username has a maximum of 10 characters.';
            return;
        }

        if (this.password.length < 6) {
            this.errorMessage = 'Password must be at least 6 characters long.';
            return;
        }

        if (!this.selectedImage) {
            this.errorMessage = 'Please select a profile image.';
            return;
        }

        const db = getDatabase();
        const usersRef = ref(db, 'users');

        const usernameQuery = query(usersRef, orderByChild('username'), equalTo(this.username));

        get(usernameQuery)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    this.errorMessage = 'Username already exists. Please choose another one.';
                } else {
                    createUserWithEmailAndPassword(authen, this.email, this.password)
                        .then((userCredential) => {
                            const userRef = ref(db, `users/${userCredential.user.uid}`);
                            set(userRef, {
                                email: this.email,
                                password: this.password,
                                username: this.username,
                                hometown: this.hometown,
                                avatarUrl: this.selectedImage,
                                language: 'en',
                            })
                                .then(() => {
                                    this.successMessage = 'Account created successfully. Redirecting to login page...';
                                    this.router.navigate(['/connexion']);
                                })
                                .catch((error) => {
                                    console.error(error);
                                    this.errorMessage = 'Failed to create account. Please try again later.';
                                });
                        })
                        .catch((error) => {
                            console.error(error);
                            this.errorMessage = 'Account creation failed. Please try again later.';
                        });
                }
            })
            .catch((error) => {
                console.error(error);
                this.errorMessage = 'Error checking username existence. Please try again later.';
            });
    }

    isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}
