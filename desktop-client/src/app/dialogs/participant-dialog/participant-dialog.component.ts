import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";

@Component({
    selector: "participant-dialog",
    templateUrl: "./participant-dialog.component.html",
    styleUrls: ["./participant-dialog.component.scss"],
})
export class ParticipantDialogComponent {
    roomName: string;
    createdDate: string;
    constructor(
        public dialogRef: MatDialogRef<ParticipantDialogComponent>,
        @Inject(MAT_DIALOG_DATA)
        public data: {
            roomId: string;
            participants: any[];
            isAdmin: boolean;
            roomName: string;
            createdDate: string;
        }
    ) {
        this.roomName = data.roomName;
        this.createdDate = data.createdDate;
    }

    deleteRoom(): void {
        this.dialogRef.close("delete");
    }
}
