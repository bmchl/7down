import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@app/services/auth-service';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { NewMatch } from '@common/game';
import { TranslateService } from '@ngx-translate/core';
import { DataSnapshot, get, getDatabase, ref, set } from 'firebase/database';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-current-matches-page',
    templateUrl: './current-matches-page.component.html',
    styleUrls: ['./current-matches-page.component.scss'],
})
export class CurrentMatchesPageComponent implements OnInit {
    serverPath = environment.serverUrl;
    matches: NewMatch[] = [];
    currentMatch: NewMatch | undefined;
    confirmationText = 'Leaving this page with also leave the lobby. Are you sure?';
    isChatMinimized: boolean = true;
    filteredMatches: NewMatch[] = [];
    uid: string | null;
    language: string;

    constructor(
        private router: Router,
        public socketService: SocketClientService,
        public gameService: ClassicGameLogicService,
        public authService: AuthService,
        public translateService: TranslateService,
    ) {}

    toggleChatMinimize() {
        this.isChatMinimized = !this.isChatMinimized;
    }

    setMatches(data: { matches: NewMatch[] }) {
        console.log('setMatches', data);
        this.matches = data.matches.filter((match) => match != null) ?? [];
        console.log('HERE', this.matches, this.socketService.id);
        this.currentMatch = this.matches.find((match) => match.players.find((p) => p.id === this.socketService.id));
        console.log('current match', this.currentMatch);
        this.findOngoingMatches(this.matches);
    }

    async findOngoingMatches(matches: NewMatch[]) {
        const tempMatches = [];
        this.filteredMatches = [];
        for (const match of matches) {
            console.log('match:', match);
            if (!match.visibility && match.startTime !== 0) {
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
            console.log('tempmatches:', tempMatches);
            this.filteredMatches = tempMatches
                .filter((match) => match.players.every((player) => !blockedUids.includes(player.uid)))
                .filter((match) => match.startTime != 0 && Date.now() - match.startTime < 600000);
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

    updateMatchInfo(data: { match: NewMatch }) {
        const index = this.matches.findIndex((match) => match.matchId === data.match.matchId);
        if (index !== -1) {
            this.matches[index] = data.match;
        } else {
            this.matches.push(data.match);
        }
        this.currentMatch = this.matches.find((match) => match.players.find((p) => p.id === this.socketService.id));
    }

    spectateMatch(matchId: string) {
        const match = this.matches.find((match) => match.matchId === matchId);
        this.addSpectatorToRoom(matchId, this.uid);
        if (match && match.gamemode === 'classic') {
            this.socketService.send('s/spectate-match', { matchId });
            this.gameService.match = match;
            this.gameService.spectator = true;

            console.log('starting game with', this.gameService.match);

            this.router.navigate(['/game']);
        } else if (match && match.gamemode === 'time-limit') {
            this.socketService.send('s/spectate-match', { matchId });
            this.gameService.match = match;
            this.gameService.spectator = true;

            console.log('starting game with', this.gameService.match);

            this.router.navigate(['/time-limit']);
        }
    }

    addSpectatorToRoom(matchId: string, userId: string | null) {
        if (!userId) {
            console.error('User ID is null, cannot add spectator to room');
            return;
        }
        const db = getDatabase();
        const participantsRef = ref(db, `rooms/${matchId}/participants/${userId}`);

        // Set the spectator's status in the room. You might want to track if they're active, etc.
        set(participantsRef, {
            spectator: true,
        })
            .then(() => {
                console.log(`Spectator ${userId} added to room ${matchId}`);
            })
            .catch((error) => {
                console.error('Failed to add spectator to room:', error);
            });
    }

    async ngOnInit(): Promise<void> {
        if (!sessionStorage.getItem('user_uid')) {
            this.uid = this.authService.getUID();
            sessionStorage.setItem('user_uid', this.uid);
        } else {
            this.uid = sessionStorage.getItem('user_uid');
        }

        this.language = await this.authService.getLanguage(this.uid);
        this.translateService.use(this.language);
        if (this.language === 'fr') {
            this.confirmationText = 'Quitter cette page quittera également le lobby. Êtes-vous sûr?';
        }

        await this.socketService.connect();

        this.socketService.on('s/update-awaiting-matches', this.setMatches.bind(this));
        this.socketService.on('s/update-match-info', this.updateMatchInfo.bind(this));
        this.socketService.send('s/get-lobbies');
    }
}
