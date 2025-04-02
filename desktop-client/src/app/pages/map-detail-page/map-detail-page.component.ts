import { Component, OnInit } from '@angular/core';
//import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { CanDeactiveComponent } from '@app/components/CanDeactivateGuard';
import { AuthService } from '@app/services/auth-service';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { RequestService } from '@app/services/request.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { Game, NewMatch } from '@common/game';
import { TranslateService } from '@ngx-translate/core';
import { DataSnapshot, get, getDatabase, onValue, ref, remove, set, update } from 'firebase/database';

import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-map-detail-page',
    templateUrl: './map-detail-page.component.html',
    styleUrls: ['./map-detail-page.component.scss'],
    styles: [':host {display: flex;}'],
})
export class MapDetailPageComponent implements OnInit, CanDeactiveComponent {
    serverPath = environment.serverUrl;
    game: Game;
    matches: NewMatch[] = [];
    currentMatch: NewMatch | undefined;
    confirmationText = 'Leaving this page with also leave the lobby. Are you sure?';
    uid: string | null = null;
    filteredMatches: NewMatch[] = [];
    userIntentionallyLeft = false;
    liked: boolean | undefined = undefined;

    constructor(
        private router: Router,
        public socketService: SocketClientService,
        public gameService: ClassicGameLogicService,
        public authService: AuthService,
        public translateService: TranslateService,
        public request: RequestService,
        public customDialogService: CustomDialogService,
    ) {
        const navigation = this.router.getCurrentNavigation();
        const state = navigation?.extras.state;
        if (state && this.game == undefined) {
            this.game = state.game;
        } else {
            this.router.navigate(['/classic']);
            // TODO: add fetching
        }
    }

    async fetchUserLikes(): Promise<void> {
        const db = getDatabase();
        const likesRef = ref(db, `users/${this.uid}/gameLikes`);

        onValue(likesRef, (snapshot) => {
            const data = snapshot.val();
            console.log('User likes:', data);
            if (data) {
                if (data[this.game.id] != null || data[this.game.id] != undefined) {
                    this.liked = data[this.game.id] == 1;
                }
            }
        });
    }

    needsConfirmation(): boolean {
        return this.currentMatch !== undefined && this.gameService.match === undefined;
    }

    onConfirm(): void {
        this.leaveLobby();
    }

    async likeGame() {
        console.log('like game');

        if (this.liked === true) {
            this.liked = undefined;
            const db = getDatabase();
            const likesRef = ref(db, `users/${this.uid}/gameLikes/${this.game.id}`);
            await set(likesRef, null);
            this.socketService.send('dislike-game', { gameId: this.game.id });
        } else if (this.liked === false) {
            this.liked = true;
            const db = getDatabase();
            const likesRef = ref(db, `users/${this.uid}/gameLikes/${this.game.id}`);
            await set(likesRef, 1);
            this.socketService.send('like-game', { gameId: this.game.id });
            this.socketService.send('like-game', { gameId: this.game.id });
        } else {
            this.liked = true;
            const db = getDatabase();
            const likesRef = ref(db, `users/${this.uid}/gameLikes/${this.game.id}`);
            await set(likesRef, 1);
            this.socketService.send('like-game', { gameId: this.game.id });
        }
    }

    dislikeGame() {
        console.log('dislike game');

        if (this.liked === false) {
            this.liked = undefined;
            const db = getDatabase();
            const likesRef = ref(db, `users/${this.uid}/gameLikes/${this.game.id}`);
            set(likesRef, null);
            this.socketService.send('like-game', { gameId: this.game.id });
        } else if (this.liked === true) {
            this.liked = false;
            const db = getDatabase();
            const likesRef = ref(db, `users/${this.uid}/gameLikes/${this.game.id}`);
            set(likesRef, 0);
            this.socketService.send('dislike-game', { gameId: this.game.id });
            this.socketService.send('dislike-game', { gameId: this.game.id });
        } else {
            this.liked = false;
            const db = getDatabase();
            const likesRef = ref(db, `users/${this.uid}/gameLikes/${this.game.id}`);
            set(likesRef, 0);
            this.socketService.send('dislike-game', { gameId: this.game.id });
        }
    }

    leaveLobby() {
        console.log('Leaving lobby');

        if (this.currentMatch?.matchId && this.uid) {
            this.socketService.send('c/leave-lobby', { matchId: this.currentMatch.matchId });

            const db = getDatabase();
            const participantsRef = ref(db, `rooms/${this.currentMatch.matchId}/participants/${this.uid}`);

            this.userIntentionallyLeft = true;
            remove(participantsRef);
            setTimeout(() => (this.userIntentionallyLeft = false), 1000);
            this.checkParticipantsAndCleanUpRoom(this.currentMatch?.matchId);
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
        this.socketService.send('c/start-game', { matchId: this.currentMatch?.matchId });

        const gameDurationMs = (this.currentMatch?.gameDuration ?? 120) * 1000;

        setTimeout(() => {
            if (this.currentMatch?.matchId) {
                this.deleteChatRoom(this.currentMatch.matchId);
            }
        }, gameDurationMs);
    }

    createLobby() {
        const data = {
            gameDuration: 120,
            gameMode: 'classic',
            visibility: undefined,
            bonusTimeOnHit: undefined,
            cheatAllowed: false,
        };

        const createMatchDialogRef = this.customDialogService.openCreateMatchDialog(data);
        createMatchDialogRef.afterClosed().subscribe((result) => {
            if (result) {
                // const uniqueSessionId = `${this.game.id}-${this.uid}`;'const matchId = response.matchId

                console.log(data.visibility);
                this.socketService.send('c/create-lobby', {
                    mapId: this.game.id,
                    visibility: data.visibility,
                    creatorUid: this.uid,
                    gameDuration: data.gameDuration,
                    cheatAllowed: data.cheatAllowed,
                });
            }
        });
    }

    joinLobby(matchId: string) {
        this.userIntentionallyLeft = false;
        if (!this.uid) {
            console.error('User ID is undefined. User must be logged in to join a lobby.');
            return;
        }
        this.serverPath;
        console.log('join-lobby');
        this.socketService.send('c/join-lobby', { matchId, creatorUid: this.uid });
    }

    setMatches(data: { map: string; matches: NewMatch[]; friendsOnly?: boolean }) {
        if (data.map !== this.game.id) return;
        this.matches = data.matches.filter((match) => match != null) ?? [];
        console.log('settings matches', this.matches, this.socketService.id);
        this.currentMatch = this.matches.find((match) => match.players.find((p) => p.id === this.socketService.id));
        console.log('current match', this.currentMatch);
        console.log(this.currentMatch);
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

    updateMatchInfo(data: { match: NewMatch }) {
        if (data.match.mapId !== this.game.id) return;
        const index = this.matches.findIndex((match) => match.matchId === data.match.matchId);
        if (index !== -1) {
            this.matches[index] = data.match;
        } else {
            this.matches.push(data.match);
        }
        this.currentMatch = this.matches.find((match) => match.players.find((p) => p.id === this.socketService.id));
        this.ensureParticipantInRoom(data.match.matchId, this.uid);

        const db = getDatabase();
        const roomRef = ref(db, `rooms/${data.match.matchId}`);
        const gameNameUpdate = { name: this.game.gameName };

        update(roomRef, gameNameUpdate)
            .then(() => console.log('Game name added to room successfully.'))
            .catch((error) => console.error('Failed to add game name to room:', error));
    }

    gameStarted(data: { match: NewMatch }) {
        if (data.match?.matchId !== this.currentMatch?.matchId) return;

        this.gameService.match = data.match;
        this.gameService.spectator = false;

        console.log('startting game with', this.gameService.match);

        this.router.navigate(['/game']);
    }

    fetchGame = () => {
        this.request.getRequest(`games/${this.game.id}`).subscribe((res: any) => {
            this.game = res;
        });
    };

    async ngOnInit(): Promise<void> {
        if (!sessionStorage.getItem('user_uid')) {
            this.uid = this.authService.getUID();
            sessionStorage.setItem('user_uid', this.uid);
        } else {
            this.uid = sessionStorage.getItem('user_uid');
        }
        //const language = await this.authService.getLanguage(this.uid);
        //console.log('Language:', language);
        //this.translateService.use(language);

        console.log('uid:', this.uid);

        await this.fetchUserLikes();
        await this.socketService.connect();
        this.socketService.on('refresh-games', this.fetchGame);
        this.socketService.on('game-ended', this.gameEndHandler.bind(this));
        this.socketService.on('update-awaiting-matches', this.setMatches.bind(this));
        this.socketService.on('update-match-info', this.updateMatchInfo.bind(this));
        this.socketService.send('c/get-lobbies', { mapId: this.game.id });
        this.socketService.on('game-started', this.gameStarted.bind(this));
    }

    ngOnDestroy(): void {
        if (this.socketService.isSocketAlive()) {
            this.socketService.off('refresh-games', this.setMatches);
            this.socketService.off('game-ended', this.gameEndHandler);
        }
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
