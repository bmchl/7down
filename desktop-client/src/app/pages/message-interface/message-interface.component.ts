import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { ReportUserDialogComponent } from '@app/dialogs/report-user-dialog/report-user-dialog.component';
import { AuthService } from '@app/services/auth-service';
import { RequestService } from '@app/services/request.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { TranslateService } from '@ngx-translate/core';
import BadWordsFilter from 'bad-words';
import { equalTo, get, getDatabase, off, onValue, orderByChild, push, query, ref, set, update } from 'firebase/database';
import { authen } from 'firebase/firebaseConfig';

//import { RegExpMatcher, TextCensor, englishDataset, englishRecommendedTransformers } from 'obscenity';
//const electron = window.require ? window.require('electron') : null;
//const ipcRenderer = electron ? electron.ipcRenderer : null;
@Component({
    selector: 'app-message-interface',
    templateUrl: './message-interface.component.html',
    styleUrls: ['./message-interface.component.scss'],
})
export class MessageInterfaceComponent implements OnInit {
    @ViewChild('messageInput') messageInput!: ElementRef;
    badWordsFilter: BadWordsFilter;
    uid: string | null;
    username: string = '';
    roomNumber: string = '';
    newMessage: { text: string; time: string } = { text: '', time: '' };
    messages: { sender: string; username: string; text: string; time: string }[] = [];
    activeUserCount: number = 0;
    //matcher: RegExpMatcher;
    //censor: TextCensor;
    previousStateIndex: number;
    currentRoom: string = 'global';
    rooms: { id: string; name: string; admin?: string | undefined; participants?: { [key: string]: { username: string; admin: boolean } } }[] = [
        { id: 'global', name: 'Global Chat' },
    ];
    userRooms: { id: string; name: string }[];
    publicRooms: { id: string; name: string }[];

    currentRoomSubject: string = '';
    newRoomName: string = '';
    roomName: string = '';
    userToAdd: string = '';
    toggleOption: string | null = null;
    isDarkMode: boolean = false;
    newRoomType: string = 'public';
    participants: { id: string; username: string; admin: boolean }[] = [];
    isPrivate: boolean = false;

    constructor(
        public router: Router,
        public route: ActivatedRoute,
        public socketService: SocketClientService,
        public authService: AuthService,
        public translateService: TranslateService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        public requestService: RequestService,
    ) {
        /*this.matcher = new RegExpMatcher({
            ...englishDataset.build(),
            ...englishRecommendedTransformers,
        });
        this.censor = new TextCensor();*/
        this.badWordsFilter = new BadWordsFilter();
    }

    async ngOnInit() {
        await this.socketService.connect();

        (async () => {
            if (!sessionStorage.getItem('user_uid')) {
                this.uid = this.authService.getUID();
                sessionStorage.setItem('user_uid', this.uid);
            } else {
                this.uid = sessionStorage.getItem('user_uid');
            }
            const language = await this.authService.getLanguage(this.uid);
            this.translateService.use(language);
        })();

        this.previousStateIndex = history.state ? history.state.navigationId : 0;

        this.fetchUsername();
        this.fetchActiveUserCount();
        this.fetchMessages();
        this.fetchUserRooms();
        this.fetchRooms();

        this.socketService.on('global-message', (data: { sender: string; username: string; message: string }) => {
            this.messages.push({
                sender: data.sender,
                username: data.username,
                text: this.sanitizeMessage(data.message),
                time: new Date().toLocaleTimeString(),
            });
        });
    }

    toggleRoomPrivacy(): void {
        this.isPrivate = !this.isPrivate;
        console.log(`Room privacy set to: ${this.isPrivate ? 'Private' : 'Public'}`);
    }

    ngOnDestroy(): void {
        const db = getDatabase();
        const messagesRef = ref(db, 'messages');
        off(messagesRef);
        this.socketService.off('global-message', (data: { sender: string; username: string; message: string }) =>
            this.messages.push({ sender: data.sender, username: data.username, text: data.message, time: new Date().toLocaleTimeString() }),
        );
    }

    fetchUsername() {
        const db = getDatabase();
        const userRef = ref(db, `users/${this.uid}/username`);

        get(userRef)
            .then((snapshot: any) => {
                this.username = snapshot.val();
            })
            .catch((error: any) => {
                console.error('Error fetching username:', error);
            });
    }

    fetchMessages(roomId: string = 'global') {
        const db = getDatabase();
        const path = `messages/rooms/${roomId}`;
        const messagesRef = ref(db, path);

        onValue(messagesRef, async (snapshot) => {
            const messages = snapshot.val();
            if (messages) {
                const filteredMessages = [];

                for (const key in messages) {
                    const senderUid = messages[key].sender;
                    const blocked = await this.isUserBlocked(senderUid);
                    if (!blocked) {
                        filteredMessages.push({
                            sender: messages[key].sender,
                            username: messages[key].username,
                            text: messages[key].message,
                            time: messages[key].time,
                        });
                    }
                }

                this.messages = filteredMessages;
            } else {
                this.messages = [];
            }
        });
    }

    detachChat(): void {
        /*if (ipcRenderer) {
            ipcRenderer.send('open-chat-window');
        } else {
            console.log('Not running inside Electron!');
        }*/
        const tempUrl = window.location.href.split('/');
        tempUrl.pop();
        tempUrl.join('/');
        const chatUrl = `${tempUrl}/standalone-chat?standalone=true`;
        window.open(chatUrl, '_blank', 'width=400,height=600');
    }

    isUserBlocked(senderUid: string): Promise<boolean> {
        const db = getDatabase();
        const blockedUsersRef = ref(db, `users/${this.uid}/blocked`);

        return new Promise<boolean>((resolve, reject) => {
            onValue(
                blockedUsersRef,
                (snapshot) => {
                    const blockedUsers = snapshot.val();
                    if (blockedUsers && blockedUsers.hasOwnProperty(senderUid)) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                },
                (error) => {
                    console.error('Error fetching blocked users:', error);
                    reject(false);
                },
            );
        });
    }

    sendMessage(): void {
        const roomId = this.currentRoom;
        const trimmedMessage = this.newMessage.text.trim();
        if (trimmedMessage !== '') {
            const path = `messages/rooms/${roomId}`;
            const db = getDatabase();
            const messagesRef = ref(db, path);
            const newMessageRef = push(messagesRef);

            const messageToSend = {
                sender: this.uid,
                username: this.username,
                message: this.sanitizeMessage(trimmedMessage),
                time: new Date().toLocaleTimeString(),
                date: new Date().toISOString().substring(0, 10),
            };
            set(newMessageRef, messageToSend)
                .then(() => {
                    console.log('Message sent to room:', roomId);
                })
                .catch((error) => {
                    console.error('Error sending message:', error);
                });

            this.newMessage.text = '';
            this.focusMessageInput();
        }
    }

    sanitizeMessage(message: string): string {
        return this.badWordsFilter.clean(message);
    }

    isMessageFromCurrentUser(messageSender: string): boolean {
        return messageSender === this.uid;
    }

    redirectToAccount() {
        this.router.navigate(['/account']);
    }

    redirectToClassic() {
        this.router.navigate(['/classic']);
    }

    sendMessageOnEnter(event: any): void {
        if (event.keyCode === 13 && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    private focusMessageInput(): void {
        if (this.messageInput && this.messageInput.nativeElement) {
            this.messageInput.nativeElement.focus();
        }
    }

    logout(): void {
        const db = getDatabase();
        const userRef = ref(db, `users/${this.uid}/isLoggedIn`);
        set(userRef, false)
            .then(() => {
                authen
                    .signOut()
                    .then(() => {
                        this.router.navigate(['/connexion']);
                    })
                    .catch((error) => {
                        console.error('Error logging out:', error);
                    });
            })
            .catch((error) => {
                console.error('Error updating user status:', error);
            });
    }

    fetchActiveUserCount(): void {
        const db = getDatabase();
        const usersRef = ref(db, 'users');
        const activeUsersQuery = query(usersRef, orderByChild('isLoggedIn'), equalTo(true));

        onValue(activeUsersQuery, (snapshot) => {
            let count = 0;
            snapshot.forEach((childSnapshot) => {
                if (childSnapshot.val().isLoggedIn) {
                    count++;
                }
            });
            this.activeUserCount = count;
        });
    }

    // sanitizeMessage(message: string): void /*string*/ {
    //     /*const matches = this.matcher.getAllMatches(message);
    //     return this.censor.applyTo(message, matches);*/
    //     return this.badWordsFilter.clean(message);
    // }

    generateRoomCode(): string {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    onRoomChange(roomId: string): void {
        const room = this.rooms.find((r) => r.id === roomId);
        if (room) {
            this.currentRoom = room.id;
            this.fetchMessages(room.id);
            this.fetchParticipants(room.id);
            if (!room.participants || !room.participants[this.uid!]) {
                this.addUserToRoomList(room.id);
            }
        }
    }

    addUserToRoomList(roomId: string): void {
        const db = getDatabase();
        const participantsRef = ref(db, `rooms/${roomId}/participants/${this.uid}`);
        set(participantsRef, { username: this.username, admin: false })
            .then(() => {
                console.log(`${this.username} added to room ${roomId} as a participant`);
                this.fetchParticipants(roomId); // Refresh the participants list
            })
            .catch((error) => {
                console.error('Error adding user to room:', error);
            });
    }

    fetchUserRooms(): void {
        const db = getDatabase();
        const userRoomsRef = ref(db, 'rooms');
        onValue(
            userRoomsRef,
            (snapshot) => {
                const roomsData = snapshot.val();
                const userRooms: { id: string; name: any; participants?: { [key: string]: { username: string; admin: boolean } } }[] = [
                    { id: 'global', name: 'Global Chat', participants: {} },
                ]; // Always include Global Chat

                for (const roomId in roomsData) {
                    const room = roomsData[roomId];
                    const isParticipant = room.participants && this.uid && room.participants.hasOwnProperty(this.uid);

                    // Initialize participants property for each room
                    const roomWithParticipants = {
                        id: roomId,
                        name: room.name,
                        participants: {} as { [key: string]: { username: string; admin: boolean } },
                    };

                    // Add user to participants if the room is private and the user is a participant
                    if (isParticipant && room.isPrivate) {
                        roomWithParticipants.participants[this.uid!] = { username: this.username, admin: true };
                    }

                    userRooms.push(roomWithParticipants);
                }

                this.rooms = userRooms;
            },
            {
                onlyOnce: true,
            },
        );
    }

    createRoom(roomName: string, isPrivate: boolean) {
        const roomId = this.generateRoomCode(); // Generate a unique room ID
        const roomRef = ref(getDatabase(), `rooms/${roomId}`);
        set(roomRef, {
            name: roomName,
            created: new Date().toISOString(),
            admin: this.uid,
            isPrivate: isPrivate,
            participants: {
                [this.uid!]: { username: this.username, admin: true },
            },
        })
            .then(() => {
                console.log(`Room ${roomName} created with ID ${roomId}`);
                this.rooms.push({ id: roomId, name: roomName }); // Add the new room to the local list
                this.currentRoom = roomId; // Set the new room as the current room
                this.fetchMessages(roomId); // Fetch messages for the new room
            })
            .catch((error) => console.error('Error creating room:', error));
    }

    joinRoom(roomId: string) {
        const db = getDatabase();
        const roomRef = ref(db, `rooms/${roomId}`);
        get(roomRef)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const roomData = snapshot.val();
                    // Check if the room is public or if the user is already a participant
                    if (!roomData.isPrivate || (roomData.participants && roomData.participants[this.uid!])) {
                        const userRef = ref(db, `rooms/${roomId}/participants/${this.uid}`);
                        set(userRef, { username: this.username, admin: false })
                            .then(() => {
                                console.log(`${this.username} added to room ${roomId}`);
                                // Once joined, refetch rooms to accurately update "My Rooms" and "Available Public Rooms"
                                this.fetchRooms(); // This function should update both arrays and handle the UI state.
                                this.currentRoom = roomId; // Update the current room context
                                this.fetchMessages(roomId); // Update the messages for the newly joined room
                                this.fetchParticipants(roomId); // Update the participants list for the room
                            })
                            .catch((error) => console.error('Error adding user to room:', error));
                    } else {
                        console.log('Access to this room is restricted.');
                    }
                } else {
                    console.log('Room does not exist.');
                }
            })
            .catch((error) => {
                console.error('Error accessing room data:', error);
            });
    }

    enterRoom(roomId: string) {
        this.currentRoom = roomId;
        this.fetchMessages(roomId);
        this.fetchParticipants(roomId);
    }

    fetchParticipants(roomId: string): void {
        if (!roomId || roomId === 'global') {
            this.participants = [];
            return;
        }

        const db = getDatabase();
        const participantsRef = ref(db, `rooms/${roomId}/participants`);

        onValue(participantsRef, (snapshot) => {
            const participantsData = snapshot.val();
            const participantsList: { id: string; username: string; admin: boolean }[] = [];

            for (const userId in participantsData) {
                if (participantsData.hasOwnProperty(userId)) {
                    participantsList.push({
                        id: userId,
                        username: participantsData[userId].username,
                        admin: participantsData[userId].admin || false,
                    });
                }
            }

            this.participants = participantsList;
        });
    }

    isAdmin(roomId: string): boolean {
        const room = this.rooms.find((r) => r.id === roomId);
        return room ? room.admin === this.uid : false;
    }

    getUserIdByUsername(username: string): Promise<string | null> {
        const db = getDatabase();
        const usersRef = ref(db, 'users');
        const queryByUsername = query(usersRef, orderByChild('username'), equalTo(username));

        return new Promise((resolve, reject) => {
            onValue(
                queryByUsername,
                (snapshot) => {
                    if (snapshot.exists()) {
                        const userId = Object.keys(snapshot.val())[0];
                        resolve(userId);
                    } else {
                        resolve(null);
                    }
                },
                {
                    onlyOnce: true,
                },
            );
        });
    }

    addUserToRoom(usernameToAdd: string): void {
        if (!usernameToAdd) {
            console.error('Username is required to add.');
            return;
        }

        this.getUserIdByUsername(usernameToAdd)
            .then((userId) => {
                if (userId) {
                    const db = getDatabase();
                    const participantsRef = ref(db, `rooms/${this.currentRoom}/participants/${userId}`);
                    set(participantsRef, {
                        username: usernameToAdd,
                        admin: false,
                    })
                        .then(() => {
                            console.log(`${usernameToAdd} added to room`);
                        })
                        .catch((error) => {
                            console.error('Error adding user to room:', error);
                        });
                } else {
                    console.error('User not found');
                }
            })
            .catch((error) => {
                console.error('Error fetching user ID:', error);
            });
    }

    fetchRooms() {
        const db = getDatabase();
        const roomsRef = ref(db, 'rooms');
        onValue(roomsRef, (snapshot) => {
            const roomsData = snapshot.val();
            const userRooms = [];
            const publicRooms = [];

            for (const roomId in roomsData) {
                const room = roomsData[roomId];
                if (room.participants && this.uid && room.participants.hasOwnProperty(this.uid)) {
                    userRooms.push({ id: roomId, name: room.name });
                } else if (!room.isPrivate && roomId.length === 6) {
                    publicRooms.push({ id: roomId, name: room.name });
                }
            }

            this.userRooms = userRooms;
            this.publicRooms = publicRooms;
        });
    }

    leaveRoom(roomId: string) {
        const db = getDatabase();
        const userRef = ref(db, `rooms/${roomId}/participants/${this.uid}`);

        set(userRef, null)
            .then(() => {
                console.log(`${this.username} has left the room ${roomId}`);

                this.fetchRooms();
            })
            .catch((error) => console.error('Error removing user from room:', error));
    }

    getRoomNameById(roomId: string): string {
        const room = this.rooms.find((r) => r.id === roomId);
        return room ? room.name : 'Unknown room';
    }

    onToggleChange(option: string) {
        this.toggleOption = option;
    }

    reportUser(username: string): void {
        this.getUserIdByUsername(username)
            .then((userId) => {
                if (userId) {
                    const dialogRef = this.dialog.open(ReportUserDialogComponent, {
                        width: '400px',
                        data: { reportedUserId: userId },
                    });

                    dialogRef.afterClosed().subscribe((reason: string) => {
                        if (reason) {
                            console.log('Reported user:', userId);

                            const db = getDatabase();
                            const userRef = ref(db, `users/${userId}`);

                            get(userRef)
                                .then((snapshot) => {
                                    let reportedReasons = snapshot.child('reportedReasons').exists() ? snapshot.child('reportedReasons').val() : [];
                                    let reportedCount = snapshot.child('reported').exists() ? snapshot.child('reported').val() + 1 : 1;

                                    if (!reportedReasons.includes(reason)) {
                                        reportedReasons.push(reason);
                                    }

                                    if (reportedCount === 3) {
                                        const userEmailRef = ref(db, `users/${userId}/email`);
                                        get(userEmailRef)
                                            .then((emailSnapshot) => {
                                                const userEmail = emailSnapshot.exists() ? emailSnapshot.val() : '';
                                                const emailData = {
                                                    userEmail: userEmail,
                                                    reportedReasons: reportedReasons.join('\n'),
                                                };

                                                this.requestService.postRequest('user/send-email', emailData).subscribe(
                                                    (response) => {
                                                        console.log('Email sent successfully:', response);
                                                        reportedCount = 0;
                                                        reportedReasons = [];
                                                        const updates: any = {};
                                                        updates['reported'] = reportedCount;
                                                        updates['reportedReasons'] = reportedReasons;
                                                        return update(userRef, updates);
                                                    },
                                                    (error) => {
                                                        console.error('Error sending email:', error);
                                                    },
                                                );
                                            })
                                            .catch((emailError) => {
                                                console.error('Error fetching user email:', emailError);
                                            });
                                    } else {
                                        const updates: any = {};
                                        updates['reported'] = reportedCount;
                                        updates['reportedReasons'] = reportedReasons;
                                        return update(userRef, updates);
                                    }
                                    const updates: any = {};
                                    updates['reported'] = reportedCount;
                                    updates['reportedReasons'] = reportedReasons;
                                    return update(userRef, updates);
                                })
                                .then(() => {
                                    console.log('Reported user:', userId);
                                    this.showSnackBar('User reported successfully.');
                                })
                                .catch((error) => {
                                    console.error('Error reporting user:', error);
                                    this.showSnackBar('Error reporting user.');
                                });
                        }
                    });
                } else {
                    console.error('No userId found for username:', username);
                }
            })
            .catch((error) => {
                console.error('Error fetching userId:', error);
            });
    }

    showSnackBar(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 3000,
        });
    }
}
