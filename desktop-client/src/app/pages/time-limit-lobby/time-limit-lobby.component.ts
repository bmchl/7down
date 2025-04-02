import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CanDeactiveComponent } from '@app/components/CanDeactivateGuard';
import { AuthService } from '@app/services/auth-service';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { NewMatch } from '@common/game';
import { TranslateService } from '@ngx-translate/core';
import { DataSnapshot, get, getDatabase, ref, remove, update } from 'firebase/database';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-time-limit-lobby',
    templateUrl: './time-limit-lobby.component.html',
    styleUrls: ['./time-limit-lobby.component.scss'],
    styles: [':host {display: flex;}'],
})
export class TimeLimitLobbyComponent implements OnInit, CanDeactiveComponent {
    serverPath = environment.serverUrl;
    matches: NewMatch[] = [];
    currentMatch: NewMatch | undefined;
    confirmationText = 'Leaving this page with also leave the lobby. Are you sure?';
    isChatMinimized: boolean = true;
    isDarkMode: boolean = false;
    uid: string | null;
    language: string;
    filteredMatches: NewMatch[] = [];
    userIntentionallyLeft = false;

    constructor(
        private router: Router,
        public socketService: SocketClientService,
        public gameService: ClassicGameLogicService,
        public authService: AuthService,
        public translateService: TranslateService,
        private customDialogService: CustomDialogService,
    ) {}

    needsConfirmation(): boolean {
        return this.currentMatch !== undefined && this.currentMatch.startTime === 0;
    }

    onConfirm(): void {
        this.leaveLobby();
    }

    leaveLobby() {
        console.log('leave lobby');
        const matchId = this.currentMatch?.matchId;
        if (matchId) {
            // Ensure matchId is not undefined
            this.socketService.send('tl/leave-lobby', { matchId });

            const db = getDatabase();
            const participantsRef = ref(db, `rooms/${matchId}/participants/${this.uid}`);

            this.userIntentionallyLeft = true;
            remove(participantsRef);
            setTimeout(() => (this.userIntentionallyLeft = false), 1000);
            this.checkParticipantsAndCleanUpRoom(matchId);

            const gameDurationMs = (this.currentMatch?.gameDuration ?? 120) * 1000;

            setTimeout(() => {
                this.deleteChatRoom(matchId);
            }, gameDurationMs);
        } else {
            console.error('Failed to leave lobby: matchId is undefined');
        }
    }

    checkParticipantsAndCleanUpRoom(matchId: string) {
        const db = getDatabase();
        const participantsRef = ref(db, `rooms/${matchId}/participants`);

        get(participantsRef)
            .then((snapshot) => {
                if (snapshot.exists() && snapshot.hasChildren()) {
                    console.log(`Chat room ${matchId} has participants.`);
                } else {
                    console.log(`Chat room ${matchId} has no participants, deleting...`);
                    const roomRef = ref(db, `rooms/${matchId}`);
                    remove(roomRef)
                        .then(() => {
                            console.log(`Chat room ${matchId} deleted successfully.`);
                        })
                        .catch((error) => {
                            console.error(`Failed to delete chat room ${matchId}:`, error);
                        });
                }
            })
            .catch((error) => {
                console.error(`Failed to check participants for chat room ${matchId}:`, error);
            });
    }

    startGame() {
        console.log('start game');
        this.socketService.send('tl/start-game', { matchId: this.currentMatch?.matchId });
    }

    createLobby() {
        const data = {
            gameDuration: 120,
            gameMode: 'time-limit',
            visibility: undefined,
            bonusTimeOnHit: 5,
            cheatAllowed: false,
        };

        const createMatchDialogRef = this.customDialogService.openCreateMatchDialog(data);
        createMatchDialogRef.afterClosed().subscribe((result) => {
            if (result) {
                console.log(data.visibility);
                this.socketService.send('tl/create-lobby', {
                    visibility: data.visibility,
                    gameDuration: data.gameDuration,
                    bonusTimeOnHit: data.bonusTimeOnHit,
                    cheatAllowed: data.cheatAllowed,
                });
            }
        });
    }

    joinLobby(matchId: string) {
        console.log('join lobby');
        this.socketService.send('tl/join-lobby', { matchId, creatorUid: this.uid });
    }

    setMatches(data: { matches: NewMatch[] }) {
        console.log('set matches with', data);
        this.matches = data.matches.filter((match) => match != null) ?? [];
        console.log('HERE', this.matches, this.socketService.id);
        this.currentMatch = this.matches.find((match) => match.players.find((p) => p.id === this.socketService.id));
        console.log('curtrent match', this.currentMatch);
        this.findOpenMatches(this.matches);
    }

    async findOpenMatches(matches: NewMatch[]) {
        const tempMatches = [];
        this.filteredMatches = [];
        for (const match of matches) {
            if (!match.visibility && match.startTime === 0) {
                // If friendsOnly is false or startTime is 0, include the match
                tempMatches.push(match);
            } else {
                const creatorId = match.players.find((player) => player.creator)?.uid;
                if (creatorId) {
                    const friends = await this.findFriends(creatorId);
                    const friendsOfFriends = [];
                    if (match.visibility === 'friendsOfFriends') {
                        for (const friend of friends) {
                            const friendFriends = await this.findFriends(friend);
                            friendsOfFriends.push(...friendFriends);
                        }
                    }
                    const isFriend = [...friends, ...friendsOfFriends].includes(this.uid ?? '');
                    if (isFriend) {
                        // If the user is a friend, include the match
                        tempMatches.push(match);
                    }
                } else {
                    console.log('Creator has no friends');
                }
            }
            const blockedUids = await this.findBlockedUids(this.uid ?? '');
            console.log('Blocked UIDs:', blockedUids);
            this.filteredMatches = tempMatches.filter((match) => match.players.every((player) => !blockedUids.includes(player.uid)));
        }
    }

    ensureParticipantInRoom(matchId: string, userId: string | null) {
        if (!userId || this.userIntentionallyLeft) return;
        const db = getDatabase();
        // Reference to the participants node under the room
        const participantsRef = ref(db, `rooms/${matchId}/participants/${userId}`);

        // Attempt to read the participant's entry
        get(participantsRef)
            .then((snapshot) => {
                if (!snapshot.exists()) {
                    // User is not a participant, add them
                    // Using an object with an index signature
                    const updates: { [key: string]: any } = {};
                    updates[`participants/${userId}`] = true;

                    // Update at the room level, so the participants entry gets created
                    const roomRef = ref(db, `rooms/${matchId}`);
                    update(roomRef, updates)
                        .then(() => console.log('User added to chat room successfully.'))
                        .catch((error) => console.error('Failed to add user to chat room:', error));
                } else {
                    console.log('User already a participant in the chat room.');
                }
            })
            .catch((error) => console.error('Failed to check if user is a participant:', error));
    }

    async findBlockedUids(uid: string) {
        try {
            const blockedUids: string[] = [];
            const blockedUidsRef = ref(getDatabase(), `users/${uid}/blocked`);
            const snapshot: DataSnapshot = await get(blockedUidsRef);

            if (snapshot.exists()) {
                const blockedUidsData = snapshot.val();
                Object.keys(blockedUidsData).forEach((blockedUid) => {
                    blockedUids.push(blockedUid);
                });
                return blockedUids;
            } else {
                return blockedUids;
            }
        } catch (error: any) {
            console.error('Error fetching blocked uids data:', error.message);
            return [];
        }
    }

    async findFriends(uid: string) {
        try {
            const friends: string[] = [];
            const friendsRef = ref(getDatabase(), `users/${uid}/friends`);
            const snapshot: DataSnapshot = await get(friendsRef);

            if (snapshot.exists()) {
                const friendsData = snapshot.val();
                Object.keys(friendsData).forEach((friendUid) => {
                    friends.push(friendUid);
                });
                return friends;
            } else {
                return friends;
            }
        } catch (error: any) {
            console.error('Error fetching friends data:', error.message);
            return [];
        }
    }

    updateMatchInfo(data: { match: NewMatch }) {
        const index = this.matches.findIndex((match) => match.matchId === data.match.matchId);
        if (index !== -1) {
            this.matches[index] = data.match;
        } else {
            this.matches.push(data.match);
        }
        this.currentMatch = this.matches.find((match) => match.players.find((p) => p.id === this.socketService.id));

        this.ensureParticipantInRoom(data.match.matchId, this.uid);

        // Update the gameName at the room level
        const db = getDatabase();
        const roomRef = ref(db, `rooms/${data.match.matchId}`);
        const gameNameUpdate = { name: 'TL Match Room' }; // Use default name for every room

        update(roomRef, gameNameUpdate)
            .then(() => console.log('Game name added to room successfully.'))
            .catch((error) => console.error('Failed to add game name to room:', error));
    }

    gameStarted(data: { match: NewMatch }) {
        if (data.match?.matchId !== this.currentMatch?.matchId) return;

        this.gameService.match = data.match;

        console.log('starting game with', this.gameService.match);

        this.router.navigate(['/time-limit']);
    }

    async ngOnInit(): Promise<void> {
        if (!sessionStorage.getItem('user_uid')) {
            this.uid = this.authService.getUID();
            sessionStorage.setItem('user_uid', this.uid);
        } else {
            this.uid = sessionStorage.getItem('user_uid');
        }
        try {
            this.language = await this.authService.getLanguage(this.uid);
            this.translateService.use(this.language);
            if (this.language === 'fr') {
                this.confirmationText = 'Quitter cette page quittera également le lobby. Êtes-vous sûr?';
            }
        } catch (error) {
            console.error('Error setting user language:', error);
        }

        await this.socketService.connect();
        this.socketService.on('tl/abandon-game', (data: unknown) => {
            const gameData = data as { userId: string; matchId: string };
            this.handleAbandonGame(gameData);
        });
        this.socketService.on('game-ended', this.gameEndHandler.bind(this));
        this.socketService.on('tl/update-awaiting-matches', this.setMatches.bind(this));
        this.socketService.on('tl/update-match-info', this.updateMatchInfo.bind(this));
        this.socketService.send('tl/get-lobbies');
        this.socketService.on('tl/game-started', this.gameStarted.bind(this));
    }

    ngOnDestroy(): void {
        if (this.socketService.isSocketAlive()) {
            this.socketService.off('refresh-games', this.setMatches);
            this.socketService.off('game-ended', this.gameEndHandler.bind(this));
            this.socketService.off('tl/abandon-game', this.handleAbandonGame.bind(this));
        }
    }

    handleAbandonGame(data: { userId: string; matchId: string }): void {
        if (!data.userId || !data.matchId) return;

        const db = getDatabase();

        // Remove the user from the participants list
        const userRef = ref(db, `rooms/${data.matchId}/participants/${data.userId}`);
        remove(userRef)
            .then(() => {
                console.log(`User ${data.userId} removed from chat room for match ${data.matchId}.`);

                // Check remaining participants
                const participantsRef = ref(db, `rooms/${data.matchId}/participants`);
                get(participantsRef).then((snapshot) => {
                    if (snapshot.exists() && snapshot.hasChildren()) {
                        console.log(`Remaining participants: ${Object.keys(snapshot.val()).length}`);
                    } else {
                        console.log(`No participants left in the chat room ${data.matchId}, deleting the entire room.`);
                        const roomRef = ref(db, `rooms/${data.matchId}`);
                        remove(roomRef)
                            .then(() => console.log(`Chat room ${data.matchId} successfully deleted.`))
                            .catch((error) => console.error(`Failed to delete chat room ${data.matchId}:`, error));
                    }
                });
            })
            .catch((error) => {
                console.error(`Failed to remove user from chat room: ${error}`);
            });
    }

    toggleChatMinimize() {
        this.isChatMinimized = !this.isChatMinimized;
    }

    gameEndHandler = (data: any) => {
        console.log('Game end event received:', data);
        if (this.currentMatch?.matchId === data.match.matchId) {
            console.log(`Attempting to delete chat room for match ${data.match.matchId}`);
            this.deleteChatRoom(data.match.matchId);
        } else {
            console.log(`Current match ID does not match the ended game match ID.`, this.currentMatch?.matchId, data.match.matchId);
        }
    };

    deleteChatRoom(matchId: string) {
        console.log(`Checking for existence of chat room ${matchId}`);
        const db = getDatabase();
        const chatRoomRef = ref(db, `rooms/${matchId}`);

        get(chatRoomRef)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    console.log(`Chat room ${matchId} exists, attempting to delete...`);
                    remove(chatRoomRef)
                        .then(() => console.log(`Chat room for match ${matchId} successfully deleted.`))
                        .catch((error) => console.error(`Failed to delete chat room for match ${matchId}:`, error));
                } else {
                    console.log(`Chat room ${matchId} does not exist or was already deleted.`);
                }
            })
            .catch((error) => {
                console.error(`Failed to check if chat room exists for match ${matchId}:`, error);
            });
    }
}
