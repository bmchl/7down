export interface CustomDialogData {
    title: string;
    confirm: string;
    cancel?: string;
    routerLink?: string;
    saveReplay?: string;
}

export interface Joiner {
    name: string;
    id: string;
    gameId: string;
    accepted?: boolean;
    denied?: boolean;
}

export interface WaitlistDialogData {
    joiners: Joiner[];
}

export interface CustomInputDialogData {
    title: string;
    inputLabel: string;
    confirm: string;
    cancel: string;
    input: string;
}

export interface CustomErrorDialogData {
    title: string;
    message: string;
}

export interface CustomImageDialogData {
    title: string;
    img: number[][][];
    differenceCount: number;
}

export interface CustomLoadingWithButtonDialogComponent {
    title: string;
}

export interface TimeLimitedDialogData {
    input: string;
    solo: boolean | undefined;
}

export interface CreateMatchDialogData {
    gameDuration: number;
    visibility: string | undefined;
    bonusTimeOnHit: number | undefined;
    gameMode: string;
    cheatAllowed: boolean;
}
