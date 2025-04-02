import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Joiner, WaitlistDialogData } from '@app/dialogs/custom-dialog-data';
import { SocketClientService } from '@app/services/socket-client.service';

@Component({
    selector: 'app-waitlist-dialog',
    templateUrl: './waitlist-dialog.component.html',
    styleUrls: ['./waitlist-dialog.component.scss'],
})
export class WaitlistDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<WaitlistDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: WaitlistDialogData,
        public socket: SocketClientService,
    ) {}

    get filteredJoiners() {
        if (!this.data.joiners) return [];
        return this.data.joiners.filter((j) => !j.denied);
    }

    accept(joiner: Joiner) {
        for (const j of this.data.joiners) {
            j.accepted = false;
        }
        joiner.accepted = true;
        if (this.dialogRef) {
            this.dialogRef.close(true);
        }
    }

    deny(joiner: Joiner) {
        joiner.denied = true;
        joiner.accepted = false;
        this.socket.send('denied', { id: joiner.id, gameId: joiner.gameId });
    }
}
