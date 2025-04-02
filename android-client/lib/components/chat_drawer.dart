import 'dart:async';
import 'dart:math';

import 'package:badword_guard/badword_guard.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';
import 'package:flutterapp/classes/chat_message.dart';
import 'package:flutterapp/classes/chat_room.dart';
import 'package:flutterapp/classes/room_user.dart';
import 'package:flutterapp/screens/profile.dart';
import 'package:flutterapp/services/firebase_service.dart';
import 'package:flutterapp/services/socket_client_service.dart';
import 'package:intl/intl.dart';

class ChatDrawer extends StatefulWidget {
  const ChatDrawer({Key? key}) : super(key: key);

  @override
  _ChatDrawerState createState() => _ChatDrawerState();
}

class _ChatDrawerState extends State<ChatDrawer> {
  bool messagesLoaded = false;
  DatabaseReference _messagesRef =
      FirebaseDatabase.instance.ref('messages/rooms/global');

  final User _user = FirebaseAuth.instance.currentUser!;
  final TextEditingController messageController = TextEditingController();
  final TextEditingController roomSearchController = TextEditingController();
  final TextEditingController roomNameController = TextEditingController();
  bool privateRoomToggle = false;
  final LanguageChecker _languageChecker = LanguageChecker();
  List<ChatRoom> rooms = [];
  String displayedRoom = '';
  List<String> joinedRooms = [];
  String currentUsername = '';
  List<ChatMessage> displayedMessages = [];
  bool notificationToggleValue = true;
  SocketClientService socketService = SocketClientService();
  bool chatDrawerLoading = true;

  @override
  void initState() {
    setState(() => chatDrawerLoading = true);
    super.initState();
    fetchChat();
    setState(() => chatDrawerLoading = false);
    // joinRoom('global');
  }

  void fetchChat() async {
    fetchUsername();
    await fetchAllRooms();
    // wait for fetchAllRooms to complete before fetching joined rooms
    // using timer

    Timer.periodic(const Duration(seconds: 1), (timer) {
      if (rooms.isNotEmpty) {
        fetchJoinedRooms();
        setupListeners();
        timer.cancel();
      }
    });
    // Timer(const Duration(seconds: 1), () {
    //   fetchJoinedRooms();
    // });
    // fetchJoinedRooms();
  }

  void setupListeners() {
    print('setupListeners');
    _messagesRef.onValue.listen((event) {
      print('messagesref changed');
      print('displayed room: $displayedRoom');
      fetchMessages(displayedRoom);
    });

    DatabaseReference userRef =
        FirebaseDatabase.instance.ref('users/${_user.uid}/rooms');

    userRef.onChildAdded.listen((event) {
      print('New room joined: ${event.snapshot.key}');
      if (!joinedRooms.contains(event.snapshot.key)) {
        print('New room not in joinedrooms: ${event.snapshot.key}');
        setState(() {
          joinedRooms.add(event.snapshot.key!);
        });
        print('Joined rooms: $joinedRooms');
      }
    });

    // FirebaseDatabase.instance.ref('rooms').onChildAdded.listen((event) {
    //   print('rooms changed');
    //   fetchAllRooms();
    // });

    // FirebaseDatabase.instance.ref('rooms').onChildChanged.listen((event) {
    //   print('rooms changed');
    //   fetchAllRooms();
    // });

    // FirebaseDatabase.instance.ref('rooms').onChildRemoved.listen((event) async {
    //   print('rooms changed');
    //   await fetchAllRooms();
    //   if (joinedRooms.contains(event.snapshot.key)) {
    //     leaveRoom(event.snapshot.key!);
    //   }
    // });
  }

  void fetchUsername() {
    FirebaseService.fetchUsername(_user.uid).then((value) {
      setState(() => currentUsername = value);
    });
  }

  Future<ChatRoom> _processRoomData(
      String roomId, Map<dynamic, dynamic> roomData) async {
    print('Processing room data: $roomData');
    print('Room ID: $roomId');
    // print('roomdata match is null : ' + roomData['match'] == null);
    ChatRoom room = ChatRoom(
      id: roomId,
      name: roomData['name'] ?? 'Unnamed',
      isMatch: roomId.length > 6,
    );

    if (room.isMatch) {
      print('Match room found: $room');
    }

    room.creationDate = roomData['created'] ?? '';
    if (roomId != 'global' && roomData['admin'] != null) {
      String uid = roomData['admin'];
      room.creator = RoomUser(
        uid: uid,
        username: await FirebaseService.fetchUsername(uid),
        avatarUrl: await FirebaseService.fetchProfilePic(uid),
        notifications: true, // Placeholder for actual notification setting
      );
    }

    final roomUserData = roomData['participants'] as Map<dynamic, dynamic>?;
    if (roomUserData != null) {
      for (var entry in roomUserData.entries) {
        String uid = entry.key;
        if (uid == _user.uid) {
          print('Current user found in room: $roomId');

          // if room is not in user's joined rooms, remove user from participants
          final userJoinedRoomsRef =
              FirebaseDatabase.instance.ref('users/${_user.uid}/rooms/$roomId');

          final data = await userJoinedRoomsRef.once();

          Map<dynamic, dynamic>? roomData =
              data.snapshot.value as Map<dynamic, dynamic>?;

          print('roomData: $roomData');

          if (roomData == null) {
            print(
                'Room not in user joined rooms, removing from participants: $roomId');
            FirebaseDatabase.instance
                .ref('rooms/$roomId/participants')
                .child(_user.uid)
                .remove();
            print('User removed from room: $roomId');
          }
        }

        room.users.add(RoomUser(
          uid: uid,
          username: await FirebaseService.fetchUsername(uid),
          //TODO REPLACE WITH await FirebaseService.fetchUsername(uid),
          avatarUrl: await FirebaseService.fetchProfilePic(uid),
          // TODO replace with await FirebaseService.fetchAvatar(uid),
          notifications:
              await FirebaseService.getUserNotificationSetting(uid, roomId),
          // TODO: Replace placeholder for actual notification setting
        ));
      }
    }

    return room;
  }

  Future<void> fetchAllRooms() async {
    setState(() => rooms.clear());

    var roomsRef = FirebaseDatabase.instance.ref('rooms');

    roomsRef.onChildAdded.listen((event) async {
      final roomData = event.snapshot.value as Map<dynamic, dynamic>?;
      print('mb- Room data: $roomData');
      if (roomData != null && roomData['isPrivate'] != true) {
        ChatRoom room = await _processRoomData(event.snapshot.key!, roomData);
        if (rooms
                .firstWhere((element) => element.id == room.id,
                    orElse: () => ChatRoom(id: '', name: ''))
                .id !=
            '') {
          print('mb- Room already exists: $room');
          setState(() {
            rooms.removeWhere((r) => r.id == room.id);
          });
        }

        setState(() => rooms.add(room));

        print('Rooms: $rooms');
        print('Room: $room')

            // if (room.isMatch) {
            //   print('joining match room');
            //   joinRoom(event.snapshot.key!);
            // }
            ;
      }
    });

    roomsRef.onChildChanged.listen((event) async {
      final roomData = event.snapshot.value as Map<dynamic, dynamic>?;
      if (roomData != null) {
        ChatRoom room = await _processRoomData(event.snapshot.key!, roomData);
        print('Room changed: $room');
        setState(() {
          rooms.removeWhere((r) => r.id == event.snapshot.key);
          rooms.add(room);
        });
      }
    });

    roomsRef.onChildRemoved.listen((event) {
      setState(() {
        rooms.removeWhere((r) => r.id == event.snapshot.key);
        if (displayedRoom == event.snapshot.key) changeRoom('global');
        if (joinedRooms.contains(event.snapshot.key)) {
          joinedRooms.removeWhere((r) => r == event.snapshot.key);
        }
      });
    });
  }

  Future<void> fetchJoinedRooms() async {
    setState(() => joinedRooms.clear());
    DatabaseReference userRef =
        FirebaseDatabase.instance.ref('users/${_user.uid}/rooms');

    final snapshot = await userRef.once();
    final joinedRoomsData = snapshot.snapshot.value as Map<dynamic, dynamic>?;
    print('Joined rooms data: $joinedRoomsData');

    List<String> joinedRoomsRes = [];
    if (joinedRoomsData != null) {
      for (var entry in joinedRoomsData.entries) {
        if (rooms.any((element) => element.id == entry.key)) {
          joinedRoomsRes.add(entry.key);
        } else if (entry.key.length > 6) {
          print('Match room found: ${entry.key}');
          joinedRoomsRes.add(entry.key);
          // fetch room data
          final matchRoomRef =
              FirebaseDatabase.instance.ref('rooms/${entry.key}');

          final data = await matchRoomRef.once();

          Map<dynamic, dynamic>? roomData =
              data.snapshot.value as Map<dynamic, dynamic>?;

          if (roomData != null) {
            ChatRoom room = await _processRoomData(entry.key, roomData);
            room.users.add(RoomUser(
              uid: _user.uid,
              username: currentUsername,
              avatarUrl: await FirebaseService.fetchProfilePic(_user.uid),
              notifications: true,
            ));
            // add user to room in fb
            print('Adding user to match room');
            matchRoomRef.child('participants').set({_user.uid: true});
            setState(() {
              rooms.add(room);
            });
          }
        } else {
          print('Joined room not found: ${entry.key}');
          userRef.child(entry.key).remove();
        }
      }
      print('Joined rooms res: $joinedRoomsRes');
    }
    joinedRooms.addAll(joinedRoomsRes);

    // Optionally, change to a default room or to the first joined room
    if (joinedRooms.isNotEmpty && joinedRooms.contains('global')) {
      print('Joined rooms: $joinedRooms');
      // if contains match room then join that room
      if (joinedRooms.any((element) => element.length > 6)) {
        print('joining match room');
        changeRoom(joinedRooms.firstWhere((element) => element.length > 6));
      } else {
        changeRoom('global');
      }
    } else {
      // Handle no joined rooms case, e.g., join a default room
      print('No joined rooms');
      joinRoom('global'); // or any other default room
    }

    // update if new rooms are joined
    //joinRoom('global');
  }

  void toggleNotifications(bool value, String roomId) {
    // Implementation of toggling notifications for a room.
    FirebaseDatabase.instance.ref('users/${_user.uid}/rooms/$roomId').update({
      'notifications': value,
    });
  }

  void updateRoomState(String roomId) async {
    setState(() {
      displayedRoom = roomId;
      // _messagesRef = FirebaseDatabase.instance.ref('messages/rooms/$roomId');
    });
    print('Updated room state to $roomId, now fetching messages.');
    await fetchMessages(roomId);
  }

  void changeRoom(String roomId) async {
    print('Changing room to $roomId');
    if (roomId != displayedRoom && joinedRooms.contains(roomId)) {
      print('Room change accepted.');
      updateRoomState(roomId);
    }
  }

  void joinRoom(String roomId) async {
    print('Joining room $roomId');
    if (roomId == displayedRoom && displayedMessages.isNotEmpty) {
      // Already in room and messages are loaded
      return;
    }

    updateRoomState(roomId);

    // Add room to user's joined rooms in the database
    FirebaseDatabase.instance
        .ref('users/${_user.uid}/rooms/$roomId')
        .set({'notifications': true});

    // Add uid to room user list in the database
    FirebaseDatabase.instance
        .ref('rooms/$roomId/participants/${_user.uid}')
        .set({'uid': _user.uid});

    setState(() {
      if (!joinedRooms.contains(roomId)) {
        joinedRooms.add(roomId);
      }
      // Assuming fetchMessages already updates displayedRoom and messages
      // Consider updating notificationToggleValue based on user settings if required
    });
  }

  void leaveRoom(String roomId) {
    // Implementation of leaving a room.
    if (roomId == 'global' || !joinedRooms.contains(roomId)) {
      return;
    }
    FirebaseDatabase.instance.ref('users/${_user.uid}/rooms/$roomId').remove();
    FirebaseDatabase.instance
        .ref('rooms/$roomId/participants/${_user.uid}')
        .remove();

    setState(() => joinedRooms.removeWhere((element) => element == roomId));

    if (displayedRoom == roomId) {
      setState(() {
        displayedRoom = 'global';
        displayedMessages.clear();
      });
      fetchMessages(roomId);
    }
  }

  Future<void> fetchMessages(String roomId) async {
    // clear the displayed messages
    setState(() {
      _messagesRef = FirebaseDatabase.instance.ref('messages/rooms/$roomId');
      displayedMessages.clear();
      messagesLoaded = false;
    });
    print('Fetching messages for room $displayedRoom, current room $roomId');
    print('Messages ref: $_messagesRef');
    List<ChatMessage> fetchedMessages =
        []; // Temporary list to hold fetched messages

    try {
      print('trying to fetch messages for room $roomId');
      // Correcting the fetch to properly handle the once() Future
      final data = await _messagesRef.once();
      Map<dynamic, dynamic>? messages =
          data.snapshot.value as Map<dynamic, dynamic>?;
      print('messages from snapshot: $messages');
      if (messages != null) {
        await _processMessagesData(messages, fetchedMessages);

        // Update your state once with the complete list of messages
        setState(() {
          print('Fetched messages: $fetchedMessages');
          displayedMessages = fetchedMessages;
          DateFormat dateFormat = DateFormat('yyyy-MM-dd h:mm:ss a');
          displayedMessages.sort((b, a) => dateFormat
              .parse(a.timestamp)
              .compareTo(dateFormat.parse(b.timestamp)));
          print('Messages loaded: $displayedMessages');
          messagesLoaded = true;
        });
      } else {
        print('No messages found');
        setState(() {
          messagesLoaded = true;
        });
      }
    } catch (e) {
      print('Error fetching messages: $e');
      // Handle your error state appropriately
    }
  }

  // @override
  // void dispose() {
  //   super.dispose();
  // }

  Future<void> _processMessagesData(
      Map<dynamic, dynamic> messages, List<ChatMessage> fetchedMessages) async {
    for (var entry in messages.entries) {
      String key = entry.key;
      Map<dynamic, dynamic> value = entry.value;
      print('Message data: $value');
      if (value != null &&
          value['sender'] != null &&
          value['username'] != null &&
          value['message'] != null &&
          value['date'] != null &&
          value['time'] != null) {
        fetchedMessages.add(ChatMessage(
          sender: RoomUser(
            uid: value['sender'] ?? '',
            username: value['username'],
            avatarUrl: await FirebaseService.fetchProfilePic(value['sender']),
          ),
          message: value['message'],
          timestamp: "${value['date'] ?? ''} ${value['time'] ?? ''}",
        ));
      } else {
        print('Invalid message data: $value');
      }
    }
  }

  void sendMessage() {
    if (messageController.text.isNotEmpty) {
      print('Sending message: ${messageController.text}');
      print('in room: $displayedRoom');
      String censoredMessage =
          messageController.text; // Apply any necessary filtering.
      _messagesRef.push().set({
        'sender': _user.uid,
        'username': currentUsername, // Fetch or pass the username accordingly.
        'message': censoredMessage,
        'date': DateFormat('yyyy-MM-dd').format(DateTime.now()),
        'time': DateFormat('h:mm:ss a').format(DateTime.now()),
        'timestamp': ServerValue.timestamp,
      });

      List<RoomUser> users =
          rooms.firstWhere((element) => element.id == displayedRoom).users;

      String displayedRoomName =
          rooms.firstWhere((element) => element.id == displayedRoom).name;

      for (RoomUser user in users) {
        if (user.notifications) {
          print("Sending notification to ${user.uid} from $currentUsername");
          FirebaseService.sendNotification(
              user.uid,
              'New Message in $displayedRoomName',
              '$currentUsername: $censoredMessage');
        }
      }

      messageController.clear();
    }
  }

  String generateRoomCode() {
    Random random = Random();
    String chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    String result = '';

    for (int i = 0; i < 6; i++) {
      result += chars[random.nextInt(chars.length)];
    }

    return result.toUpperCase();
  }

  void createRoom(String name, {bool isPrivate = false}) {
    final DatabaseReference roomsRef = FirebaseDatabase.instance.ref('rooms');

    final roomId = generateRoomCode();

    roomsRef.child(roomId).set({
      'name': name,
      'admin': FirebaseAuth.instance.currentUser!.uid,
      'created': DateFormat('yyyy-MM-dd').format(DateTime.now()),
      'isPrivate': isPrivate,
    });

    joinRoom(roomId);
  }

  @override
  Widget build(BuildContext context) {
    var bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Drawer(
        width: MediaQuery.of(context).size.width * 0.3,
        child: chatDrawerLoading
            ? const Center(child: CircularProgressIndicator())
            : GestureDetector(
                onTap: () {
                  // This line dismisses the keyboard by taking away the focus of the TextFormField
                  FocusScope.of(context).unfocus();
                },
                child: Padding(
                  padding: EdgeInsets.only(bottom: bottomInset),
                  child: Column(
                    // Use Column instead of ListView as the root widget.
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(28, 16, 16, 10),
                        child: Row(
                          children: [
                            IconButton(
                              onPressed: () {
                                Navigator.of(context).pop();
                              },
                              icon: const Icon(Icons.close),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                AppLocalizations.of(context)!.translate('Chat'),
                                style: TextStyle(
                                  color:
                                      Theme.of(context).colorScheme.onSurface,
                                ),
                              ),
                            ),
                            ElevatedButton.icon(
                              onPressed: () => {
                                showModalBottomSheet(
                                  context: context,
                                  isScrollControlled: true,
                                  constraints: BoxConstraints(
                                    maxHeight:
                                        MediaQuery.of(context).size.height *
                                            0.9,
                                    minWidth:
                                        MediaQuery.of(context).size.width * 0.7,
                                    maxWidth:
                                        MediaQuery.of(context).size.width * 0.7,
                                  ),
                                  builder: (context) => Expanded(
                                    child: DefaultTabController(
                                      length: 2,
                                      child: Column(
                                        children: [
                                          TabBar(
                                            tabs: [
                                              Tab(
                                                  text:
                                                      'Current Room: ${rooms.firstWhere((element) => element.id == displayedRoom).name}'),
                                              const Tab(text: 'All Rooms'),
                                            ],
                                          ),
                                          Expanded(
                                            child: TabBarView(
                                              children: [
                                                Padding(
                                                    padding:
                                                        const EdgeInsets.all(
                                                            8.0),
                                                    child: Column(
                                                        crossAxisAlignment:
                                                            CrossAxisAlignment
                                                                .start,
                                                        children: [
                                                          const SizedBox(
                                                              height: 10),
                                                          Row(children: [
                                                            Expanded(
                                                                child: Column(
                                                                    mainAxisAlignment:
                                                                        MainAxisAlignment
                                                                            .start,
                                                                    crossAxisAlignment:
                                                                        CrossAxisAlignment
                                                                            .start,
                                                                    children: [
                                                                  Text(
                                                                      AppLocalizations.of(
                                                                              context)!
                                                                          .translate(
                                                                              'Room ID'),
                                                                      style:
                                                                          TextStyle(
                                                                        fontSize:
                                                                            16,
                                                                        color: Colors
                                                                            .grey[600],
                                                                      )),
                                                                  Text(
                                                                      displayedRoom,
                                                                      style:
                                                                          const TextStyle(
                                                                        fontSize:
                                                                            24,
                                                                        fontWeight:
                                                                            FontWeight.bold,
                                                                      )),
                                                                ])),
                                                            Expanded(
                                                                child: Column(
                                                                    mainAxisAlignment:
                                                                        MainAxisAlignment
                                                                            .start,
                                                                    crossAxisAlignment:
                                                                        CrossAxisAlignment
                                                                            .start,
                                                                    children: [
                                                                  Text(
                                                                      AppLocalizations.of(
                                                                              context)!
                                                                          .translate(
                                                                              'Chatting since'),
                                                                      style:
                                                                          TextStyle(
                                                                        fontSize:
                                                                            16,
                                                                        color: Colors
                                                                            .grey[600],
                                                                      )),
                                                                  Text(
                                                                      rooms
                                                                          .firstWhere((element) =>
                                                                              element.id ==
                                                                              displayedRoom)
                                                                          .creationDate,
                                                                      style:
                                                                          const TextStyle(
                                                                        fontSize:
                                                                            24,
                                                                        fontWeight:
                                                                            FontWeight.bold,
                                                                      )),
                                                                ])),
                                                          ]),
                                                          const SizedBox(
                                                              height: 10),
                                                          // notification toggle
                                                          displayedRoom !=
                                                                  'global'
                                                              ? Text(
                                                                  AppLocalizations.of(
                                                                          context)!
                                                                      .translate(
                                                                          'Room Admin'),
                                                                  style:
                                                                      TextStyle(
                                                                    fontSize:
                                                                        16,
                                                                    color: Colors
                                                                            .grey[
                                                                        600],
                                                                  ))
                                                              : const SizedBox(),
                                                          displayedRoom !=
                                                                  'global'
                                                              ? ListTile(
                                                                  onTap: () => {
                                                                    showModalBottomSheet(
                                                                        context:
                                                                            context,
                                                                        isScrollControlled:
                                                                            true,
                                                                        constraints:
                                                                            BoxConstraints(
                                                                          maxHeight:
                                                                              MediaQuery.of(context).size.height * 0.9,
                                                                          minWidth:
                                                                              MediaQuery.of(context).size.width * 0.7,
                                                                          maxWidth:
                                                                              MediaQuery.of(context).size.width * 0.7,
                                                                        ),
                                                                        builder:
                                                                            (context) =>
                                                                                Expanded(child: Profile(uid: rooms.firstWhere((element) => element.id == displayedRoom).creator.uid)))
                                                                  },
                                                                  title: Text(rooms
                                                                      .firstWhere((element) =>
                                                                          element
                                                                              .id ==
                                                                          displayedRoom)
                                                                      .creator
                                                                      .username),
                                                                  leading:
                                                                      CircleAvatar(
                                                                    backgroundImage: NetworkImage(rooms
                                                                        .firstWhere((element) =>
                                                                            element.id ==
                                                                            displayedRoom)
                                                                        .creator
                                                                        .avatarUrl),
                                                                  ),
                                                                )
                                                              : const SizedBox(),
                                                          const Divider(),
                                                          Text(
                                                              AppLocalizations.of(
                                                                      context)!
                                                                  .translate(
                                                                      'Active Users'),
                                                              style: TextStyle(
                                                                fontSize: 16,
                                                                color: Colors
                                                                    .grey[600],
                                                              )),
                                                          Expanded(
                                                            child: ListView
                                                                .builder(
                                                              itemCount: rooms
                                                                  .firstWhere((element) =>
                                                                      element
                                                                          .id ==
                                                                      displayedRoom)
                                                                  .users
                                                                  .length,
                                                              itemBuilder:
                                                                  (context,
                                                                      index) {
                                                                return ListTile(
                                                                  onTap: () {
                                                                    showModalBottomSheet(
                                                                        context:
                                                                            context,
                                                                        isScrollControlled:
                                                                            true,
                                                                        constraints:
                                                                            BoxConstraints(
                                                                          maxHeight:
                                                                              MediaQuery.of(context).size.height * 0.9,
                                                                          minWidth:
                                                                              MediaQuery.of(context).size.width * 0.7,
                                                                          maxWidth:
                                                                              MediaQuery.of(context).size.width * 0.7,
                                                                        ),
                                                                        builder:
                                                                            (context) =>
                                                                                Expanded(child: Profile(uid: rooms.firstWhere((element) => element.id == displayedRoom).users[index].uid)));
                                                                  },
                                                                  title: Text(rooms
                                                                      .firstWhere((element) =>
                                                                          element
                                                                              .id ==
                                                                          displayedRoom)
                                                                      .users[
                                                                          index]
                                                                      .username),
                                                                  leading:
                                                                      CircleAvatar(
                                                                    backgroundImage: NetworkImage(rooms
                                                                        .firstWhere((element) =>
                                                                            element.id ==
                                                                            displayedRoom)
                                                                        .users[
                                                                            index]
                                                                        .avatarUrl),
                                                                  ),
                                                                );
                                                              },
                                                            ),
                                                          ),
                                                        ])),
                                                Padding(
                                                    padding:
                                                        const EdgeInsets.all(
                                                            8.0),
                                                    child: Column(
                                                      crossAxisAlignment:
                                                          CrossAxisAlignment
                                                              .start,
                                                      children: [
                                                        // const Padding(
                                                        //   padding: EdgeInsets.all(8.0),
                                                        //   child: Text(
                                                        //     'Chat',
                                                        //     style: TextStyle(
                                                        //       fontSize: 18,
                                                        //       fontWeight: FontWeight.bold,
                                                        //     ),
                                                        //   ),
                                                        // ),
                                                        // Divider(), // Add a divider below the "Chat" text

                                                        // search bar
                                                        TextField(
                                                          controller:
                                                              roomSearchController,
                                                          decoration:
                                                              InputDecoration(
                                                            hintText: AppLocalizations
                                                                    .of(
                                                                        context)!
                                                                .translate(
                                                                    'Search rooms'),
                                                            prefixIcon: Icon(
                                                                Icons.search),
                                                            border:
                                                                OutlineInputBorder(
                                                              borderRadius: BorderRadius
                                                                  .all(Radius
                                                                      .circular(
                                                                          10)),
                                                            ),
                                                          ),
                                                        ),

                                                        Expanded(
                                                          child:
                                                              ListView.builder(
                                                            itemCount: rooms
                                                                .where((element) => element
                                                                    .name
                                                                    .toLowerCase()
                                                                    .contains(
                                                                        roomSearchController
                                                                            .text
                                                                            .toLowerCase()))
                                                                .toList()
                                                                .length,
                                                            itemBuilder:
                                                                (context,
                                                                    index) {
                                                              List<ChatRoom> displayedRooms = rooms
                                                                  .where((element) =>
                                                                      element
                                                                          .name
                                                                          .toLowerCase()
                                                                          .contains(roomSearchController
                                                                              .text
                                                                              .toLowerCase()) &&
                                                                      !element
                                                                          .isMatch)
                                                                  .toList();
                                                              return Card(
                                                                child: ListTile(
                                                                  title: Text(
                                                                      displayedRooms[
                                                                              index]
                                                                          .name),
                                                                  trailing: joinedRooms
                                                                          .contains(
                                                                              displayedRooms[index].id)
                                                                      ? ElevatedButton(
                                                                          child:
                                                                              Text(AppLocalizations.of(context)!.translate('Leave')),
                                                                          onPressed:
                                                                              () {
                                                                            leaveRoom(rooms[index].id);
                                                                          },
                                                                        )
                                                                      : ElevatedButton(
                                                                          child:
                                                                              Text(AppLocalizations.of(context)!.translate('Join')),
                                                                          onPressed:
                                                                              () {
                                                                            joinRoom(displayedRooms[index].id);
                                                                          },
                                                                        ),
                                                                ),
                                                              );
                                                            },
                                                          ),
                                                        ),
                                                      ],
                                                    )),
                                                // Center(child: Text("Friends List")),
                                                // Center(child: Text("Friend Requests")),
                                                // AddFriendsMenu(), // Include your AddFriendsMenu widget here
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                )
                              },
                              label: Text(AppLocalizations.of(context)!
                                  .translate('Rooms')),
                              icon: const Icon(Icons.people),
                            ),
                          ],
                        ),
                      ),
                      const Divider(),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                        child: Wrap(
                          spacing: 8,
                          children: joinedRooms
                              .followedBy(['+'])
                              .map((room) => ActionChip(
                                    backgroundColor: room == displayedRoom
                                        ? Theme.of(context)
                                            .colorScheme
                                            .secondary
                                        : Theme.of(context).colorScheme.surface,
                                    label: room == "+"
                                        ? const Icon(Icons.add, size: 20)
                                        : Text(
                                            rooms
                                                    .firstWhere((element) =>
                                                        element.id == room)
                                                    ?.name ??
                                                'UNKNOWN',
                                            style: TextStyle(
                                                color: room == displayedRoom
                                                    ? Theme.of(context)
                                                        .colorScheme
                                                        .onSecondary
                                                    : Theme.of(context)
                                                        .colorScheme
                                                        .onSurface)),
                                    onPressed: () {
                                      if (room == '+') {
                                        showDialog(
                                          context: context,
                                          builder: (context) => AlertDialog(
                                            title: Text(
                                                AppLocalizations.of(context)!
                                                    .translate('Create Room')),
                                            content: Column(children: [
                                              TextField(
                                                controller: roomNameController,
                                                decoration: InputDecoration(
                                                  hintText: AppLocalizations.of(
                                                          context)!
                                                      .translate('Room Name'),
                                                ),
                                              ),
                                              // toggle private
                                              Row(
                                                children: [
                                                  Checkbox(
                                                      value: privateRoomToggle,
                                                      onChanged: (newValue) {
                                                        setState(() {
                                                          privateRoomToggle =
                                                              newValue!;
                                                        });
                                                      }),
                                                  Text(
                                                    AppLocalizations.of(
                                                            context)!
                                                        .translate("Private"),
                                                  )
                                                ],
                                              ),
                                            ]),
                                            actions: [
                                              TextButton(
                                                onPressed: () {
                                                  Navigator.of(context).pop();
                                                },
                                                child: Text(AppLocalizations.of(
                                                        context)!
                                                    .translate('Cancel')),
                                              ),
                                              TextButton(
                                                onPressed: () {
                                                  // Implement the logic to create a room.
                                                  createRoom(
                                                      roomNameController.text,
                                                      isPrivate:
                                                          privateRoomToggle);
                                                  Navigator.of(context).pop();
                                                },
                                                child: Text(AppLocalizations.of(
                                                        context)!
                                                    .translate('Create')),
                                              ),
                                            ],
                                          ),
                                        );
                                      } else if (room != displayedRoom) {
                                        changeRoom(room);
                                      } else {
                                        print('Already in room $room');
                                      }
                                    },
                                  ))
                              .toList(),
                        ),
                      ),
                      const Divider(),
                      Expanded(
                        child: !messagesLoaded
                            ? const Center(child: CircularProgressIndicator())
                            : displayedMessages.isEmpty
                                ? Center(
                                    child: Text(AppLocalizations.of(context)!
                                        .translate('No messages')))
                                : ListView.builder(
                                    reverse: true,
                                    itemCount: displayedMessages.length,
                                    itemBuilder: (context, index) {
                                      bool isSentByMe = displayedMessages[index]
                                              .sender
                                              .username ==
                                          currentUsername;
                                      return Align(
                                        alignment: isSentByMe
                                            ? Alignment.centerRight
                                            : Alignment.centerLeft,
                                        child: Container(
                                          margin: const EdgeInsets.symmetric(
                                              horizontal: 15, vertical: 5),
                                          alignment: isSentByMe
                                              ? Alignment.centerRight
                                              : Alignment.centerLeft,
                                          child: Column(
                                            crossAxisAlignment: isSentByMe
                                                ? CrossAxisAlignment.end
                                                : CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                displayedMessages[index]
                                                    .sender
                                                    .username,
                                                textAlign: TextAlign.left,
                                                style: const TextStyle(
                                                    fontSize: 12,
                                                    color: Colors.blueGrey),
                                              ),
                                              GestureDetector(
                                                onLongPress: () => {
                                                  if (!isSentByMe)
                                                    {
                                                      FirebaseService
                                                          .reportUser(
                                                              displayedMessages[
                                                                      index]
                                                                  .sender
                                                                  .uid,
                                                              context),
                                                    }
                                                },
                                                child: Row(
                                                    mainAxisAlignment:
                                                        isSentByMe
                                                            ? MainAxisAlignment
                                                                .end
                                                            : MainAxisAlignment
                                                                .start,
                                                    crossAxisAlignment:
                                                        CrossAxisAlignment.end,
                                                    children: [
                                                      isSentByMe
                                                          ? const SizedBox()
                                                          : CircleAvatar(
                                                              backgroundImage:
                                                                  Image.network(displayedMessages[
                                                                              index]
                                                                          .sender
                                                                          .avatarUrl)
                                                                      .image,
                                                            ),
                                                      SizedBox(
                                                          width: isSentByMe
                                                              ? 0
                                                              : 10), // Add this line
                                                      ConstrainedBox(
                                                        constraints:
                                                            BoxConstraints(
                                                          maxWidth:
                                                              250, // Set this to your desired maximum width
                                                        ),
                                                        child: Container(
                                                          padding:
                                                              const EdgeInsets
                                                                  .symmetric(
                                                                  horizontal:
                                                                      15,
                                                                  vertical: 10),
                                                          decoration:
                                                              BoxDecoration(
                                                            color: isSentByMe
                                                                ? Theme.of(
                                                                        context)
                                                                    .primaryColor
                                                                : Colors
                                                                    .grey[300],
                                                            borderRadius:
                                                                BorderRadius
                                                                    .circular(
                                                                        20),
                                                          ),
                                                          child: Text(
                                                            displayedMessages[
                                                                    index]
                                                                .message,
                                                            style: TextStyle(
                                                                fontSize: 16,
                                                                color: isSentByMe
                                                                    ? Colors
                                                                        .white
                                                                    : Colors
                                                                        .black),
                                                          ),
                                                        ),
                                                      ),
                                                      SizedBox(
                                                          width: isSentByMe
                                                              ? 10
                                                              : 0),
                                                      isSentByMe
                                                          ? CircleAvatar(
                                                              backgroundImage:
                                                                  Image.network(displayedMessages[
                                                                              index]
                                                                          .sender
                                                                          .avatarUrl)
                                                                      .image,
                                                            )
                                                          : IconButton(
                                                              onPressed: () {
                                                                if (!isSentByMe) {
                                                                  FirebaseService.reportUser(
                                                                      displayedMessages[
                                                                              index]
                                                                          .sender
                                                                          .uid,
                                                                      context);
                                                                }
                                                              },
                                                              icon: const Icon(
                                                                  Icons.flag)),
                                                    ]),
                                              ),
                                              Text(
                                                displayedMessages[index]
                                                    .timestamp,
                                                style: const TextStyle(
                                                    fontSize: 12,
                                                    color: Colors.blueGrey),
                                              )
                                            ],
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                      ),
                      // Divider(),
                      Container(
                        padding: const EdgeInsets.only(
                            bottom: 8.0, right: 8.0, left: 8.0),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                onSubmitted: (value) => sendMessage(),
                                controller: messageController,
                                decoration: InputDecoration(
                                  hintText: AppLocalizations.of(context)!
                                      .translate("Type a message"),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(20),
                                    borderSide: BorderSide.none,
                                  ),
                                  fillColor:
                                      Theme.of(context).colorScheme.surface,
                                  filled: true,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            FloatingActionButton(
                              onPressed: sendMessage,
                              child: const Icon(Icons.send),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                )));
  }
}
