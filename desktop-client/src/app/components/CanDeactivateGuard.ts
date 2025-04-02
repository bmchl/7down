import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable } from 'rxjs';

export interface CanDeactiveComponent {
    needsConfirmation(): boolean;
    onConfirm(): void;
    confirmationText: string;
}

@Injectable({ providedIn: 'root' })
export class CanDeactivateGuard implements CanDeactivate<CanDeactiveComponent> {
    canDeactivate(component: CanDeactiveComponent): Observable<boolean> | boolean {
        console.log('confirmation: ', component.needsConfirmation());
        if (component.needsConfirmation()) {
            const confirmation = confirm(component.confirmationText);
            if (confirmation) {
                component.onConfirm();
            }
            return confirmation;
        }
        return true;
    }
}
