import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationDialogComponent } from '@app/dialogs/confirmation-dialog/confirmation-dialog.component';
import { AuthService } from '@app/services/auth-service';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { DarkModeService } from '@app/services/dark-mode.service';
import { ReplayService } from '@app/services/replay.service';
import { RequestService } from '@app/services/request.service';
import { TranslateService } from '@ngx-translate/core';
import { User, deleteUser, getAuth } from 'firebase/auth';
import { equalTo, get, getDatabase, onValue, orderByChild, query, ref, remove, set } from 'firebase/database';
import { authen } from 'firebase/firebaseConfig';

@Component({
    selector: 'app-account-page',
    templateUrl: './account-page.component.html',
    styleUrls: ['./account-page.component.scss'],
})
export class AccountPageComponent implements OnInit {
    uid: string | null;
    usernameUpdateMessage: string = '';
    username: string = '';
    hometown: string = '';
    hometownUpdateMessage: string = '';
    avatarUrl: string = '';
    selected = 'en';
    activeTab: string = 'friends';
    friendRequests: any[] = [];
    friends: any[] = [];
    initialUser: User | null = null;
    replayEvents: any[] = [];
    isDarkMode: boolean;
    themeModeUpdateMessage: string = '';
    loginCount: number = 0;
    logoutCount: number = 0;
    numberOfGamesPlayed: number = 0;
    numberOfGamesWon: number = 0;
    averageTimePerGame: number = 0;
    averageDifferencesFoundPerGame: number = 0;

    constructor(
        public router: Router,
        public route: ActivatedRoute,
        public translateService: TranslateService,
        public dialog: MatDialog,
        public authService: AuthService,
        public requestService: RequestService,
        private storage: AngularFireStorage,
        // private renderer: Renderer2,
        public gameService: ClassicGameLogicService,
        public replayService: ReplayService,
        // @Inject(DOCUMENT) private document: Document,
        public darkModeService: DarkModeService,
        public dialogService: CustomDialogService,
        public cdr: ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        const auth = getAuth();
        console.log('auth:', auth);
        if (!sessionStorage.getItem('user_uid')) {
            this.uid = this.authService.getUID();
            sessionStorage.setItem('user_uid', this.uid);
        } else {
            this.uid = sessionStorage.getItem('user_uid');
        }

        this.fetchThemeMode();

        this.isDarkMode = document.body.classList.contains('dark');
        this.fetchUserLanguage();
        this.fetchUserData();
        this.fetchFriendRequests();
        this.fetchFriends();
        this.fetchReplayEvents();
        // this.toggleDarkMode();
        this.fetchStats();
    }

    navigateToAddFriendPage() {
        // this.router.navigate(['/add-friend']);
        this.dialogService.openSearchDialog();
    }

    fetchStats() {
        const uid = this.uid;
        this.requestService.getRequest(`games/history?uid=${uid}`).subscribe(
            (history: any) => {
                // Explicitly specifying the type as any
                if (!history) {
                    console.error('History data is null or undefined.');
                    return;
                }
                if (Array.isArray(history)) {
                    // Check if history is an array
                    // Filtered game history for the current user
                    this.numberOfGamesPlayed = history.length;
                    console.log('history***********', history);
                    this.numberOfGamesWon = history.filter((game: any) => {
                        return game.players.some((player: any) => player.uid === uid && game.winnerSocketId === player.id);
                    }).length;

                    let totalTimePlayed = 0;
                    let totalDifferencesFound = 0;
                    history.forEach((game: any) => {
                        const startTime = game.startTime;
                        const endTime = game.endTime;
                        if (startTime && endTime) {
                            totalTimePlayed += endTime - startTime; // Add the duration of each game
                        }
                        game.players.forEach((player: any) => {
                            if (player.uid === uid) {
                                totalDifferencesFound += player.found; // Add the number of differences found by the player
                            }
                        });
                    });
                    this.averageTimePerGame = Math.round(totalTimePlayed / this.numberOfGamesPlayed / 1000);
                    this.averageDifferencesFoundPerGame = Math.round(totalDifferencesFound / this.numberOfGamesPlayed);
                    // Write the statistics to Firebase database
                    const db = getDatabase();
                    const statsRef = ref(db, `users/${uid}/stats`);
                    const stats = {
                        numberOfGamesPlayed: this.numberOfGamesPlayed,
                        numberOfGamesWon: this.numberOfGamesWon,
                        averageTimePerGame: this.averageTimePerGame,
                        averageDifferencesFound: this.averageDifferencesFoundPerGame,
                    };
                    if (uid) {
                        set(statsRef, stats)
                            .then(() => {
                                console.log('Statistics updated successfully.');
                            })
                            .catch((error) => {
                                console.error('Error updating statistics:', error);
                            });
                    }
                } else {
                    console.error('Invalid history data:', history);
                }
            },
            (error) => {
                console.error('Error fetching game history:', error);
            },
        );
    }

    fetchThemeMode(): void {
        const db = getDatabase();
        const themeModeRef = ref(db, `users/${this.uid}/themeMode`);

        get(themeModeRef)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    this.selected = snapshot.val();
                    this.isDarkMode = snapshot.val() === 'dark';
                    this.applyThemeMode();
                }
            })
            .catch((error) => {
                console.error('Error fetching theme mode preference:', error);
            });
    }

    applyThemeMode(): void {
        if (this.isDarkMode) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
        this.cdr.detectChanges();
    }

    toggleTab(tab: string) {
        this.activeTab = tab;
    }

    fetchUserLanguage() {
        const db = getDatabase();
        const userLanguageRef = ref(db, `users/${this.uid}/language`);

        get(userLanguageRef)
            .then((snapshot: any) => {
                this.translateService.use(snapshot.val());
                this.selected = snapshot.val();
            })
            .catch((error: any) => {
                console.error('Error fetching user language:', error);
            });
    }

    toggleDarkMode(): void {
        this.isDarkMode = this.selected === 'dark';
        const db = getDatabase();
        const themeModeRef = ref(db, `users/${this.uid}/themeMode`);
        set(themeModeRef, this.selected)
            .then(() => {
                console.log('Theme mode preference updated successfully.');
                this.themeModeUpdateMessage = this.isDarkMode ? 'Switched to Dark Mode' : 'Switched to Light Mode'; // Set the message
                this.applyThemeMode();
                setTimeout(() => {
                    this.themeModeUpdateMessage = ''; // Clear the message after some time
                }, 5000);
            })
            .catch((error) => {
                console.error('Error updating theme mode preference:', error);
                this.themeModeUpdateMessage = 'Error updating theme mode preference';
            });
    }

    updateUserLanguage(language: string) {
        const db = getDatabase();
        const userLanguageRef = ref(db, `users/${this.uid}/language`);

        set(userLanguageRef, language)
            .then(() => {})
            .catch((error) => {
                console.error('Error updating user language preference:', error);
            });
    }

    fetchUserData() {
        const db = getDatabase();
        const userRef = ref(db, `users/${this.uid}`);

        onValue(
            userRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    this.username = snapshot.val()?.username;
                    this.avatarUrl = snapshot.val()?.avatarUrl;
                    this.hometown = snapshot.val()?.hometown;
                    this.loginCount = snapshot.val()?.loginCount || 0;
                    this.logoutCount = snapshot.val()?.logoutCount || 0;
                }
            },
            (error) => {
                console.error('Error fetching user data:', error);
            },
        );
    }

    fetchReplayEvents() {
        const db = getDatabase();
        const replayEventsRef = ref(db, `users/${this.uid}/replayEvents`);

        onValue(replayEventsRef, (snapshot: any) => {
            const data = snapshot.val();
            console.log(data, Object.keys(data));
            if (data) {
                this.replayEvents = Object.keys(data);
            } else {
                this.replayEvents = [];
            }
        });
    }

    handleReplayEventClick(uniqueId: string) {
        const db = getDatabase();
        const replayEventRef = ref(db, `users/${this.uid}/replayEvents/${uniqueId}`);

        onValue(replayEventRef, (snapshot: any) => {
            const data: {
                mapId: string;
                startGameTime: number;
                gameTime: number;
                events: any[];
            } = snapshot.val();
            if (data) {
                console.log(`Events for unique ID ${uniqueId}:`, data);
                this.gameService.match = {
                    mapId: data.mapId,
                    spectators: [],
                } as any;
                this.replayService.isSavedReplay = true;
                this.replayService.isDisplaying = true;
                this.replayService.startGameTime = data.startGameTime;
                this.replayService.gameTime = data.gameTime;
                this.replayService.events = data.events;
                this.replayService.reset();
                this.replayService.replay();
                this.replayService.pause();
                this.router.navigate(['/game']);
            } else {
                console.log(`No events found for unique ID ${uniqueId}`);
            }
        });
    }

    deleteReplayEvent(uniqueId: string) {
        const db = getDatabase();
        const replayEventRef = ref(db, `users/${this.uid}/replayEvents/${uniqueId}`);

        remove(replayEventRef)
            .then(() => {
                console.log(`Replay event ${uniqueId} deleted successfully.`);
                this.replayEvents = this.replayEvents.filter((event) => event !== uniqueId);
            })
            .catch((error) => {
                console.error(`Error deleting replay event ${uniqueId}:`, error);
            });
    }

    fetchFriends() {
        const db = getDatabase();
        const friendsRef = ref(db, `users/${this.uid}/friends`);

        onValue(friendsRef, (snapshot) => {
            this.friends = []; // Clear the existing list of friends
            snapshot.forEach((childSnapshot) => {
                const friendUid = childSnapshot.key;
                const userRef = ref(db, `users/${friendUid}`);

                onValue(
                    userRef,
                    (userSnapshot) => {
                        if (userSnapshot.exists()) {
                            const userData = userSnapshot.val();
                            const friendData = {
                                id: friendUid,
                                username: userData.username,
                                avatarUrl: userData.avatarUrl,
                                hometown: userData.hometown,
                            };
                            this.friends = this.friends.filter((f) => f.id !== friendUid); // Remove old data
                            this.friends.push(friendData); // Add updated data
                        }
                    },
                    (error) => {
                        console.error('Error fetching friend data:', error);
                    },
                );
            });
        });
    }

    fetchFriendRequests() {
        const db = getDatabase();
        const requestsRef = ref(db, `users/${this.uid}/requests/received`);

        onValue(requestsRef, (snapshot) => {
            this.friendRequests = []; // Clear the existing list of friend requests
            snapshot.forEach((childSnapshot) => {
                const senderUid = childSnapshot.key;
                const userRef = ref(db, `users/${senderUid}`);

                onValue(
                    userRef,
                    (userSnapshot) => {
                        if (userSnapshot.exists()) {
                            const userData = userSnapshot.val();
                            const requestData = {
                                id: childSnapshot.key,
                                senderUid: senderUid,
                                senderUsername: userData.username,
                                senderAvatarUrl: userData.avatarUrl,
                                hometown: userData.hometown,
                            };
                            this.friendRequests = this.friendRequests.filter((req) => req.id !== childSnapshot.key); // Remove old data
                            this.friendRequests.push(requestData); // Add updated data
                        }
                    },
                    (error) => {
                        console.error('Error fetching friend request data:', error);
                    },
                );
            });
        });
    }

    async acceptFriendRequest(requestId: string) {
        try {
            const db = getDatabase();
            const requestRef = ref(db, `users/${this.uid}/requests/received/${requestId}`);
            const snapshot = await get(requestRef);
            const requestData = snapshot.val();

            if (requestData) {
                const senderUid = requestData;

                // Remove the request from the receiver's 'requests/received' node
                const receiverRequestsRef = ref(db, `users/${this.uid}/requests/received/${requestId}`);
                await remove(receiverRequestsRef);

                // Add the senderUid to the receiver's 'friends' node
                const receiverFriendRef = ref(db, `users/${this.uid}/friends/${senderUid}`);
                await set(receiverFriendRef, senderUid);
                //[senderUid]: senderUid,
                //username: requestData.senderUsername,
                //avatarUrl: requestData.senderAvatarUrl,
                //});

                // Add the receiverUid to the sender's 'friends' node
                const senderFriendRef = ref(db, `users/${senderUid}/friends/${this.uid}`);
                await set(senderFriendRef, this.uid);
                //[this.uid as string]: this.uid,
                //username: this.username,
                //avatarUrl: this.avatarUrl,

                // Remove the request from the sender's 'requests/sent' node
                const senderRequestsRef = ref(db, `users/${senderUid}/requests/sent/${this.uid}`);
                await remove(senderRequestsRef);
            } else {
                console.error('Request data not found.');
            }
        } catch (error) {
            console.error('Error accepting friend request:', error);
        }
    }

    async denyFriendRequest(requestId: string) {
        try {
            const db = getDatabase();
            const receiverUid = this.uid;
            const senderUid = requestId;

            const senderRequestsRef = ref(db, `users/${senderUid}/requests/sent/${receiverUid}`);
            await remove(senderRequestsRef);
            const receiverRequestsRef = ref(db, `users/${receiverUid}/requests/received/${senderUid}`);
            await remove(receiverRequestsRef);
        } catch (error) {
            console.error('Error denying friend request:', error);
        }
    }

    // async UserStats() {
    //     const db = getDatabase();
    //     const userStatsRef = ref(db, `users/${this.uid}/statistics`);

    //     try {
    //         const snapshot = await get(userStatsRef);
    //         const userData = snapshot.val();

    //         if (userData) {
    //             this.gamesPlayed = userData.gamesPlayed || 0;
    //             this.gamesWon = userData.gamesWon || 0;
    //             this.averageDifferencesFound = userData.averageDifferencesFound || 0;
    //             this.averageTimePerGame = userData.averageTimePerGame || 0;

    //             const players = this.gameService.match.players;
    //             players.forEach((player) => {
    //                 if (userData[player.id]) {
    //                     userData[player.id].gamesPlayed = (userData[player.id].gamesPlayed || 0) + 1;
    //                 }
    //             });

    //             const winnerId = this.gameService.match.winnerSocketId;
    //             if (winnerId && userData[winnerId]) {
    //                 userData[winnerId].gamesWon = (userData[winnerId].gamesWon || 0) + 1;
    //             }

    //             await update(ref(db), {
    //                 [`users/${this.uid}/statistics`]: userData,
    //             });
    //         }
    //     } catch (error) {
    //         console.error('Error fetching user statistics:', error);
    //     }
    // }

    // updateGamesPlayed() {
    //     const db = getDatabase();
    //     const gamesPlayedRef = ref(db, `statistics/${this.uid}/gamesPlayed`);

    //     runTransaction(gamesPlayedRef, (currentValue) => {
    //         return (currentValue || 0) + 1;
    //     });
    // }

    // updateGamesWon() {
    //     const db = getDatabase();
    //     const gamesWonRef = ref(db, `statistics/${this.uid}/gamesWon`);

    //     runTransaction(gamesWonRef, (currentValue) => {
    //         return (currentValue || 0) + 1;
    //     });
    // }

    updateUsername() {
        const db = getDatabase();
        const usersRef = ref(db, 'users');

        const usernameQuery = query(usersRef, orderByChild('username'), equalTo(this.username));

        get(usernameQuery)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    this.usernameUpdateMessage = 'Username already exists. Please choose another one.';
                    setTimeout(() => {
                        this.usernameUpdateMessage = '';
                    }, 5000);
                } else {
                    const userRef = ref(db, `users/${this.uid}/username`);
                    set(userRef, this.username)
                        .then(() => {
                            this.usernameUpdateMessage = 'Username updated successfully';
                            setTimeout(() => {
                                this.usernameUpdateMessage = '';
                            }, 5000);
                        })
                        .catch((error) => {
                            console.error('Error updating username:', error);
                            this.usernameUpdateMessage = 'An error occurred while updating username. Please try again.';
                            setTimeout(() => {
                                this.usernameUpdateMessage = '';
                            }, 5000);
                        });
                }
            })
            .catch((error) => {
                console.error('Error checking username existence:', error);
                this.usernameUpdateMessage = 'An error occurred while checking username existence. Please try again.';
                setTimeout(() => {
                    this.usernameUpdateMessage = '';
                }, 5000);
            });
    }

    updateHometown() {
        const db = getDatabase();
        const userRef = ref(db, `users/${this.uid}/hometown`);

        set(userRef, this.hometown)
            .then(() => {
                this.hometownUpdateMessage = 'Hometown updated successfully';
                setTimeout(() => {
                    this.hometownUpdateMessage = '';
                }, 5000);
            })
            .catch((error) => {
                console.error('Error updating hometown:', error);
                this.hometownUpdateMessage = 'An error occurred while updating hometown. Please try again.';
                setTimeout(() => {
                    this.hometownUpdateMessage = '';
                }, 5000);
            });
    }

    onDrop(event: any) {
        this.uploadAvatar(event);
    }

    onDragOver(event: any) {
        this.uploadAvatar(event);
    }

    async uploadAvatar(e: Event): Promise<void> {
        const input = e.target as HTMLInputElement;
        if (input.files) {
            const file = input.files[0];
            const filePath = `avatars/${this.uid}/${this.uid}.jpg`;
            const fileRef = this.storage.ref(filePath);

            const db = getDatabase();
            const userRef = ref(db, `users/${this.uid}/avatarUrl`);
            get(userRef)
                .then((snapshot) => {
                    if (snapshot.exists() && snapshot.val()) {
                        // If an existing avatar URL exists
                        const previousImageUrl = snapshot.val();
                        if (previousImageUrl.startsWith('avatars/')) {
                            // Check if the previous image is in the avatars/ folder
                            const storageRef = this.storage.refFromURL(previousImageUrl);
                            storageRef
                                .delete()
                                .toPromise()
                                .then()
                                .catch((error) => {
                                    console.error('Error deleting previous image from Firestore:', error);
                                });
                        }
                    }
                })
                .catch((error) => {
                    console.error('Error checking for existing avatar URL:', error);
                })
                .finally(() => {
                    fileRef
                        .put(file)
                        .then(() => {
                            fileRef.getDownloadURL().subscribe((downloadURL) => {
                                this.avatarUrl = downloadURL;
                                this.storeImageUrlInDatabase(this.avatarUrl);
                            });
                        })
                        .catch((error) => {
                            console.error('Error uploading new image:', error);
                        });
                });
        }
    }

    storeImageUrlInDatabase(url: string) {
        const db = getDatabase();
        const userRef = ref(db, `users/${this.uid}/avatarUrl`);

        set(userRef, url)
            .then()
            .catch((error) => {
                console.error('Error storing image URL:', error);
            });
    }

    changeLanguage(lang: string) {
        this.translateService.use(lang);
        this.selected = lang;
        this.updateUserLanguage(lang);
    }

    logout(): void {
        const db = getDatabase();
        const userRef = ref(db, `users/${this.uid}/isLoggedIn`);
        set(userRef, false)
            .then(() => {
                authen
                    .signOut()
                    .then(() => {
                        sessionStorage.setItem('user_uid', '');
                        this.router.navigate(['/connexion']);
                        this.authService.incrementLogoutCount(this.uid!);
                    })
                    .catch((error) => {
                        console.error('Error logging out:', error);
                    });
            })
            .catch((error) => {
                console.error('Error updating user status:', error);
            });
    }

    async deleteFriend(friendId: string) {
        try {
            const db = getDatabase();

            // Remove friend from the current user's friends list
            const userFriendRef = ref(db, `users/${this.uid}/friends/${friendId}`);
            await remove(userFriendRef);

            // Remove the current user from the friend's friends list
            const friendFriendRef = ref(db, `users/${friendId}/friends/${this.uid}`);
            await remove(friendFriendRef);
        } catch (error) {
            console.error('Error deleting friend:', error);
        }
    }

    async confirmDeleteAccount(): Promise<void> {
        // Open a confirmation dialog
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            width: '300px',
            data: 'Are you sure you want to delete your account?',
        });

        // Handle dialog close event
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                try {
                    console.log('authen.currentUser:', authen.currentUser);
                    const user = authen.currentUser;
                    if (user) {
                        const db = getDatabase();
                        //await user.reload(); // Refresh the user's authentication state
                        await deleteUser(user);
                        if (this.uid) {
                            await this.removeUserReferences(this.uid);
                        }
                        const userRef = ref(db, `users/${this.uid}`);
                        await remove(userRef);
                        sessionStorage.setItem('user_uid', '');
                        this.router.navigate(['/connexion']);
                    } else {
                        console.error('No user is currently signed in.');
                    }
                } catch (error) {
                    console.error('Error deleting user account and data:', error);
                }
            }
        });
    }

    async removeUserReferences(userId: string): Promise<void> {
        try {
            const db = getDatabase();
            const usersRef = ref(db, 'users');

            const usersSnapshot = await get(usersRef);
            const userIds = Object.keys(usersSnapshot.val() || {});

            for (const otherUserId of userIds) {
                if (otherUserId !== userId) {
                    await this.removeUserFromFriendsList(otherUserId, userId);
                    await this.removeUserFromBlockedList(otherUserId, userId);
                    await this.removeUserFromRequestsSentAndReceived(otherUserId, userId);
                }
            }
        } catch (error) {
            console.error('Error removing user references:', error);
        }
    }

    async removeUserFromFriendsList(userId: string, userToRemoveId: string): Promise<void> {
        const db = getDatabase();
        const friendsRef = ref(db, `users/${userId}/friends/${userToRemoveId}`);
        await remove(friendsRef);
    }

    async removeUserFromBlockedList(userId: string, userToRemoveId: string): Promise<void> {
        const db = getDatabase();
        const blockedRef = ref(db, `users/${userId}/blocked/${userToRemoveId}`);
        await remove(blockedRef);
    }

    async removeUserFromRequestsSentAndReceived(userId: string, userToRemoveId: string): Promise<void> {
        const db = getDatabase();

        // Remove from requests sent
        const sentRequestsRef = ref(db, `users/${userId}/requests/sent/${userToRemoveId}`);
        await remove(sentRequestsRef);

        // Remove from requests received
        const receivedRequestsRef = ref(db, `users/${userId}/requests/received/${userToRemoveId}`);
        await remove(receivedRequestsRef);
    }
}
