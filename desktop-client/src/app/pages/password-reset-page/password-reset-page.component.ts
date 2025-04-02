import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { authen } from 'firebase/firebaseConfig';

@Component({
    selector: 'app-password-reset-page',
    templateUrl: './password-reset-page.component.html',
    styleUrls: ['./password-reset-page.component.scss'],
})
export class PasswordResetPageComponent implements OnInit {
    email: string = '';
    errorMessage: string = '';
    successMessage: string = '';
    isDarkMode: boolean = false;

    constructor(public router: Router, private renderer: Renderer2, @Inject(DOCUMENT) private document: Document) {}

    ngOnInit(): void {}

    toggleDarkMode(): void {
        this.isDarkMode = !this.isDarkMode;
        if (this.isDarkMode) {
            this.renderer.addClass(this.document.body, 'dark');
        } else {
            this.renderer.removeClass(this.document.body, 'dark');
        }
    }

    sendResetEmail(): void {
        if (!this.email) {
            this.errorMessage = 'Please enter your email address.';
            return;
        }

        sendPasswordResetEmail(authen, this.email)
            .then(() => {
                this.successMessage = 'Password reset email sent. Please check your inbox.';
            })
            .catch((error) => {
                console.error(error);
                this.errorMessage = 'Failed to send password reset email. Please try again later.';
            });
    }
}
