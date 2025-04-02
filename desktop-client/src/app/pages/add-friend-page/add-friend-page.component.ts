import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '@app/services/auth-service';
import { TranslateService } from '@ngx-translate/core';
import { equalTo, get, getDatabase, onValue, orderByChild, query, ref, remove, set } from 'firebase/database';

@Component({
    selector: 'app-add-friend-page',
    templateUrl: './add-friend-page.component.html',
    styleUrls: ['./add-friend-page.component.scss'],
})
export class AddFriendPageComponent implements OnInit {
    uid: string | null;
    user: any = {};
    users: any[] = [];
    filteredUsers: any[] = [];
    searchQuery: string = '';
    errorMessages: { [key: string]: string } = {};
    loading: boolean = true;
    searchMode: 'username' | 'hometown' = 'username';
    isDarkMode: boolean = false;
    language: string;

    constructor(
        public route: ActivatedRoute,
        public authService: AuthService,
        public translateService: TranslateService,
        private renderer: Renderer2,
        @Inject(DOCUMENT) private document: Document,
        public dialogRef: MatDialogRef<AddFriendPageComponent>,
    ) {}

    ngOnInit() {
        (async () => {
            if (!sessionStorage.getItem('user_uid')) {
                this.uid = this.authService.getUID();
                sessionStorage.setItem('user_uid', this.uid);
            } else {
                this.uid = sessionStorage.getItem('user_uid');
            }
            try {
                this.language = await this.authService.getLanguage(this.uid);
                this.translateService.use(this.language);
            } catch (error) {
                console.error('Error setting user language:', error);
            }
            this.fetchUsers();
            this.searchUsers();
            this.fetchUser();
        })();
    }

    toggleDarkMode(): void {
        this.isDarkMode = !this.isDarkMode;
        if (this.isDarkMode) {
            this.renderer.addClass(this.document.body, 'dark');
        } else {
            this.renderer.removeClass(this.document.body, 'dark');
        }
    }

    fetchUser() {
        this.loading = true;
        const db = getDatabase();
        const userRef = ref(db, `users/${this.uid}`);

        get(userRef)
            .then((snapshot: any) => {
                if (snapshot.exists()) {
                    this.user = {
                        id: snapshot.key,
                        username: snapshot.val().username,
                        avatarUrl: snapshot.val().avatarUrl,
                    };
                } else {
                    console.error('User data does not exist.');
                }
            })
            .catch((error: any) => {
                console.error('Error fetching user data:', error);
            })
            .finally(() => {
                this.loading = false;
            });
    }

    async fetchUsers() {
        const db = getDatabase();
        const usersRef = ref(db, 'users');

        onValue(
            usersRef,
            (snapshot) => {
                this.users = [];
                const promises: any[] = [];

                snapshot.forEach((childSnapshot) => {
                    const userId = childSnapshot.key;
                    if (userId !== this.uid) {
                        const user = childSnapshot.val();
                        const blockedRef = ref(db, `users/${this.uid}/blocked/${userId}`);
                        promises.push(
                            get(blockedRef)
                                .then((blockedSnapshot) => {
                                    if (!blockedSnapshot.exists()) {
                                        this.users.push({
                                            id: userId,
                                            username: user.username,
                                            avatarUrl: user.avatarUrl,
                                            hometown: user.hometown,
                                        });
                                    }
                                })
                                .catch((error) => {
                                    console.error('Error fetching blocked status:', error);
                                }),
                        );
                    }
                });

                Promise.all(promises).then(() => {
                    this.searchUsers(); // Re-filter the users after the list is updated
                });
            },
            (error) => {
                console.error('Error fetching users:', error);
            },
        );
    }

    searchUsers() {
        console.log(this.searchQuery.trim());
        if (this.searchQuery.trim() === '') {
            this.filteredUsers = this.users;
        } else {
            if (this.searchMode === 'username') {
                console.log('unfiltered', this.filteredUsers);
                this.filteredUsers = this.users.filter((user) =>
                    user.username ? user.username.toLowerCase().includes(this.searchQuery.toLowerCase()) : false,
                );
                console.log('filtered', this.filteredUsers);
            } else if (this.searchMode === 'hometown') {
                this.filteredUsers = this.users.filter((user) =>
                    user.hometown ? user.hometown.toLowerCase().includes(this.searchQuery.toLowerCase()) : false,
                );
            }
        }
    }

    toggleSearchMode() {
        this.searchMode = this.searchMode === 'username' ? 'hometown' : 'username';
        this.searchQuery = '';
        this.fetchUsers();
    }

    async sendFriendRequest(receiverUsername: string, userId: string) {
        try {
            console.log('receiverUsername', receiverUsername);
            console.log('userId', userId);
            // Find the receiver's UID based on their username
            const db = getDatabase();
            const usersRef = ref(db, 'users');
            const usernameQuery = query(usersRef, orderByChild('username'), equalTo(receiverUsername));
            const snapshot = await get(usernameQuery);
            if (snapshot.exists()) {
                const receiverUid = Object.keys(snapshot.val())[0];
                const senderUid = this.uid;

                // Check if a friend request has already been sent to this user
                const sentRequestsRef = ref(db, `users/${senderUid}/requests/sent/${receiverUid}`);
                const sentSnapshot = await get(sentRequestsRef);
                if (sentSnapshot.exists()) {
                    if (this.language === 'fr') {
                        this.errorMessages[userId] = "Demande d'ami déjà envoyée à cet utilisateur.";
                    } else {
                        this.errorMessages[userId] = 'Friend request already sent to this user.';
                    }
                    return;
                }

                // Check if the user is already a friend
                const friendsRef = ref(db, `users/${senderUid}/friends/${receiverUid}`);
                const friendsSnapshot = await get(friendsRef);
                if (friendsSnapshot.exists()) {
                    if (this.language === 'fr') {
                        this.errorMessages[userId] = 'Cet utilisateur est déjà votre ami.';
                    } else {
                        this.errorMessages[userId] = 'This user is already your friend.';
                    }
                    return;
                }

                // Check if the user has already received a friend request from the sender
                const receiverRequestsRef = ref(db, `users/${senderUid}/requests/received/${receiverUid}`);
                const receiverRequestsSnapshot = await get(receiverRequestsRef);
                if (receiverRequestsSnapshot.exists()) {
                    if (this.language === 'fr') {
                        this.errorMessages[userId] = "Vous avez déjà reçu une demande d'ami de cet utilisateur.";
                    } else {
                        this.errorMessages[userId] = 'You have already received a friend request from this user.';
                    }
                    return;
                }

                // Proceed with sending the friend request if not already sent or friends
                const receiverFriendRequestRef = ref(db, `users/${receiverUid}/requests/received/${senderUid}`);

                await set(receiverFriendRequestRef, senderUid);
                //[senderUid as string]: senderUid, // Sender UID
                //senderUsername: this.user.username, // Sender username
                //senderAvatarUrl: this.user.avatarUrl, // Sender avatar URL
                //});

                const senderFriendRequestRef = ref(db, `users/${senderUid}/requests/sent/${receiverUid}`);
                await set(senderFriendRequestRef, receiverUid);
                //[receiverUid]: receiverUid, // Receiver UID
                //receiverUsername: receiverUsername, // Receiver username
                //receiverAvatarUrl: snapshot.val()[receiverUid].avatarUrl, // Receiver avatar URL
                //});

                this.errorMessages[userId] = ''; // Reset error message on successful request
            } else {
                console.error('Receiver not found.');
            }
        } catch (error) {
            console.error('Error sending friend request:', error);
            if (this.language === 'fr') {
                this.errorMessages[userId] = 'Une erreur est survenue lors de lenvoi de la demande dami.';
            } else {
                this.errorMessages[userId] = 'An error occurred while sending the friend request.';
            }
        }
    }

    async isFriend(userId: string) {
        try {
            const db = getDatabase();
            const friendsRef = ref(db, `users/${this.uid}/friends/${userId}`);
            const snapshot = await get(friendsRef);
            return snapshot.exists();
        } catch (error) {
            console.error('Error checking if friend:', error);
            return false;
        }
    }

    async isFriendRequestSent(userId: string) {
        try {
            const db = getDatabase();
            const requestRef = ref(db, `users/${this.uid}/requests/sent/${userId}`);
            const snapshot = await get(requestRef);
            return snapshot.exists();
        } catch (error) {
            console.error('Error checking if friend request sent:', error);
            return false;
        }
    }

    async blockUser(userId: string) {
        try {
            const db = getDatabase();

            // Remove blocked user from current user's friend list
            const currentUserFriendsRef = ref(db, `users/${this.uid}/friends/${userId}`);
            await remove(currentUserFriendsRef);

            // Remove current user from blocked user's friend list
            const blockedUserFriendsRef = ref(db, `users/${userId}/friends/${this.uid}`);
            await remove(blockedUserFriendsRef);

            // Delete any friend requests sent by the current user to the blocked user
            const currentUserSentRequestsRef = ref(db, `users/${this.uid}/requests/sent/${userId}`);
            await remove(currentUserSentRequestsRef);

            // Delete any friend requests received by the blocked user from the current user
            const blockedUserReceivedRequestsRef = ref(db, `users/${userId}/requests/received/${this.uid}`);
            await remove(blockedUserReceivedRequestsRef);

            // Delete any friend requests received by the current user from the blocked user
            const currentUserReceivedRequestsRef = ref(db, `users/${this.uid}/requests/received/${userId}`);
            await remove(currentUserReceivedRequestsRef);

            // Delete any friend requests sent by the blocked user to the current user
            const blockedUserSentRequestsRef = ref(db, `users/${userId}/requests/sent/${this.uid}`);
            await remove(blockedUserSentRequestsRef);

            const currentUserBlockedRef = ref(db, `users/${this.uid}/blocked/${userId}`);
            await set(currentUserBlockedRef, true);

            const blockedUserBlockedRef = ref(db, `users/${userId}/blocked/${this.uid}`);
            await set(blockedUserBlockedRef, true);

            this.filteredUsers = this.filteredUsers.filter((user) => user.id !== userId);
        } catch (error) {
            console.error('Error blocking user:', error);
        }
    }

    async toggleFriendsVisibility(userId: string) {
        const user = this.filteredUsers.find((u) => u.id === userId);
        if (user) {
            if (user.showFriends) {
                user.showFriends = false;
                user.friends = []; // Initialize or clear friends array
            } else {
                // Show friends
                try {
                    const db = getDatabase();
                    const friendsRef = ref(db, `users/${userId}/friends`);
                    const snapshot = await get(friendsRef);
                    const friendIds = Object.keys(snapshot.val() || {});
                    const promises: Promise<any>[] = [];
                    user.friends = []; // Initialize or clear friends array
                    friendIds.forEach((friendId) => {
                        const friendUserRef = ref(db, `users/${friendId}`);
                        promises.push(
                            get(friendUserRef).then((friendSnapshot: any) => {
                                user.friends.push({
                                    id: friendId,
                                    username: friendSnapshot.val().username,
                                    avatarUrl: friendSnapshot.val().avatarUrl,
                                    hometown: friendSnapshot.val().hometown,
                                });
                            }),
                        );
                    });
                    await Promise.all(promises);
                    user.showFriends = true;
                } catch (error) {
                    console.error('Error fetching friends:', error);
                }
            }
        }
    }
}
