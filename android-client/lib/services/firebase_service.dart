import 'dart:convert';

import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/components/report_user_dialog.dart';
import 'package:flutterapp/services/request_service.dart';
import 'package:http/http.dart';

class FirebaseService {
  static Future<void> cleanRequests(
      String currentUserId, String friendUserId) async {
    // users can send both a request to each other, so we need to remove both when accepting or declining
    DatabaseReference userRef =
        FirebaseDatabase.instance.reference().child('users');

    await userRef
        .child(currentUserId)
        .child('requests/received')
        .child(friendUserId)
        .remove();
    await userRef
        .child(currentUserId)
        .child('requests/sent')
        .child(friendUserId)
        .remove();
    await userRef
        .child(friendUserId)
        .child('requests/sent')
        .child(currentUserId)
        .remove();
    await userRef
        .child(friendUserId)
        .child('requests/received')
        .child(currentUserId)
        .remove();
  }

  static Future<void> removeFriend(
      String currentUserId, String friendId) async {
    DatabaseReference userRef =
        FirebaseDatabase.instance.reference().child('users');

    await userRef
        .child(currentUserId)
        .child('friends')
        .child(friendId)
        .remove();
    await userRef
        .child(friendId)
        .child('friends')
        .child(currentUserId)
        .remove();
  }

  static Future<bool> getUserNotificationSetting(
      String uid, String roomId) async {
    print('Get User Notification Setting: $uid, $roomId');
    DatabaseReference _userRef =
        FirebaseDatabase.instance.reference().child('users').child(uid);
    final notifRef = await _userRef.child('rooms').child(roomId).once();
    if (!notifRef.snapshot.exists) {
      return false;
    }
    DataSnapshot dataSnapshot = notifRef.snapshot;
    return (dataSnapshot.value as Map<dynamic, dynamic>)['notifications'] ??
        false;
  }

  static Future<List<Map<dynamic, dynamic>>> getFriends(
      String currentUserId) async {
    DatabaseReference userRef =
        FirebaseDatabase.instance.reference().child('users');

    DatabaseEvent friendsEvent =
        await userRef.child(currentUserId).child('friends').once();
    DataSnapshot snapshot = friendsEvent.snapshot;

    List<Map<dynamic, dynamic>> friendsList = [];

    if (snapshot.value != null) {
      Map<dynamic, dynamic> friendsMap =
          snapshot.value as Map<dynamic, dynamic>;
      await Future.forEach(friendsMap.entries, (entry) async {
        String friendId = entry.key;
        DatabaseEvent userDataEvent = await userRef.child(friendId).once();
        DataSnapshot userDataSnapshot = userDataEvent.snapshot;

        if (userDataSnapshot.value != null) {
          Map<dynamic, dynamic> friendData =
              userDataSnapshot.value as Map<dynamic, dynamic>;
          friendData['id'] = friendId;
          friendsList.add(friendData);
        }
      });
    }

    return friendsList;
  }

  static Future<String> fetchUsername(String uid) async {
    DatabaseReference userRef =
        FirebaseDatabase.instance.reference().child('users').child(uid);
    final dataSnapshot = await userRef.once();
    Map<dynamic, dynamic>? userData =
        dataSnapshot.snapshot.value as Map<dynamic, dynamic>?;
    print('Fetch Username: ${userData?['username']}');
    return userData?['username'] ?? '';
  }

  static Future<String> fetchProfilePic(String uid) async {
    DatabaseReference userRef =
        FirebaseDatabase.instance.reference().child('users').child(uid);
    final dataSnapshot = await userRef.once();
    Map<dynamic, dynamic>? userData =
        dataSnapshot.snapshot.value as Map<dynamic, dynamic>?;
    print('Fetch Profile Pic: ${userData?['avatarUrl']}');
    return userData?['avatarUrl'] ?? '';
  }

  static void sendNotification(
    String receiverId,
    String title,
    String body,
  ) async {
    print('Sending notification to $receiverId');
    DatabaseReference userRef =
        FirebaseDatabase.instance.reference().child('users');

    DatabaseEvent tokenEvent =
        await userRef.child(receiverId).child('fcmToken').once();
    DataSnapshot tokenSnapshot = tokenEvent.snapshot;

    if (tokenSnapshot.value != null) {
      String fcmToken = tokenSnapshot.value.toString();
      RequestService requestService = RequestService();

      Map<String, String> reqBody = {
        'to': fcmToken,
        'notification': jsonEncode({
          'title': title,
          'body': body,
        }),
      };

      try {
        Response response = await requestService.postRequest(
            // or send request to our server which uses the Firebase Admin SDK
            'firebase/send',
            reqBody);

        if (response.statusCode == 200) {
          print('Notification sent successfully');
        } else {
          print('Failed to send notification: ${response.body}');
        }
      } catch (error) {
        print('Failed to send notification: $error');
      } finally {
        requestService.dispose();
      }
    }
  }

  static Future<List<String>> getBlockedUsers(String currentUserId) async {
    DatabaseReference userRef =
        FirebaseDatabase.instance.reference().child('users');

    try {
      DatabaseEvent blockedEvent =
          await userRef.child(currentUserId).child('blocked').once();
      DataSnapshot snapshot = blockedEvent.snapshot;

      List<String> blockedUsers = [];

      if (snapshot.value != null && snapshot.value is Map<dynamic, dynamic>) {
        Map<dynamic, dynamic> blockedMap =
            snapshot.value as Map<dynamic, dynamic>;
        blockedUsers = blockedMap.keys.map((key) => key.toString()).toList();
      }

      return blockedUsers;
    } catch (error) {
      print('Error fetching blocked users: $error');
      return [];
    }
  }

  static Future<bool> isUserBlocked(
      String currentUserId, String senderUid) async {
    DatabaseReference userRef =
        FirebaseDatabase.instance.reference().child('users');

    try {
      List<String> blockedUsers = await getBlockedUsers(currentUserId);

      return blockedUsers.contains(senderUid);
    } catch (error) {
      print('Error checking blocked users: $error');
      return false;
    }
  }

  // static void createMatchRoom(
  //     {required String id,
  //     required String name,
  //     required List<String> players}) {
  //   final DatabaseReference roomsRef = FirebaseDatabase.instance.ref('rooms');

  //   print('Creating match room: $id, $players');

  //   roomsRef.child(id).set({
  //     'private': false,
  //     'name': name,
  //     'creator': FirebaseAuth.instance.currentUser!.uid,
  //     'match': {
  //       'players': players,
  //     }
  //   });
  // }

  static void ensureParticipantInRoom(String matchId, String uid) async {
    print('Ensure participant in room: $matchId, $uid');

    DatabaseReference roomRef = FirebaseDatabase.instance.ref('rooms/$matchId');

    final data = await roomRef.once();
    Map<dynamic, dynamic>? room = data.snapshot.value as Map<dynamic, dynamic>?;
    print('Match room data: $room');
    if (room == null) {
      print('Room does not exist.');
      roomRef.set({
        'name': 'Match Room',
        'created': DateTime.now().toIso8601String(),
        'private': false,
        'admin': uid,
        'participants': {uid: true},
      });
    } else {
      print('Room exists, adding participant.');
      // add the user as a participant
      roomRef.child('participants/$uid').set(true);
    }

    // roomRef.child('admin').once().then((data) {
    //   if (data.snapshot.value != null) {
    //     print('Room does not exist.');
    //     roomRef.set({
    //       'name': 'Match Room',
    //       'created': DateTime.now().toIso8601String(),
    //       'private': false,
    //       'admin': FirebaseAuth.instance.currentUser!.uid,
    //       'participants': {uid: true},
    //     });
    //   } else {
    //     print('Room exists, adding participant.');
    //     // add the user as a participant
    //     roomRef.child('participants/$uid').set(true);
    //   }
    // });

    // // Add uid to room user list in the database
    // await FirebaseDatabase.instance
    //     .ref('rooms/$matchId')
    //     .set({'participants/$uid': true});

    // Add the user as a participant
    await FirebaseDatabase.instance
        .ref('users/$uid/rooms/$matchId')
        .set({'notifications': true});
  }

  static Future<void> leaveMatchRoom(String matchId, String uid) async {
    print('Leaving match room: $matchId, $uid');

    FirebaseDatabase.instance.ref('users/$uid/rooms/$matchId').remove();
    FirebaseDatabase.instance.ref('rooms/$matchId/participants/$uid').remove();

    DatabaseReference roomRef =
        FirebaseDatabase.instance.ref('rooms/$matchId/participants');
    // roomRef.child(uid).remove();

    final snapshot = await roomRef.once();

    final roomParticipantsData =
        snapshot.snapshot.value as Map<dynamic, dynamic>?;

    print('roomParticipantsData: $roomParticipantsData');

    if (roomParticipantsData == null) {
      print('Room does not have any participants, deleting room.');
      deleteMatchRoom(matchId);
    }
  }

//   ensureParticipantInRoom(matchId: string, userId: string | null) {
//         if (!userId) return;

//         const db = getDatabase();
//         const participantsRef = ref(db, `rooms/${matchId}/participants`);
//         get(participantsRef)
//             .then((snapshot) => {
//                 if (snapshot.exists() && snapshot.hasChild(userId)) {
//                     console.log('User already a participant in the chat room.');
//                 } else {
//                     // Add the user as a participant
//                     update(participantsRef, {
//                         [userId]: true,
//                     })
//                         .then(() => {
//                             console.log('User added to chat room successfully.');
//                         })
//                         .catch((error) => {
//                             console.error('Failed to add user to chat room:', error);
//                         });
//                 }
//             })
//             .catch((error) => {
//                 console.error('Failed to check participants:', error);
//             });
//     }

  static Future<void> reportUser(String userId, BuildContext context) async {
    final dialogRef = showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) {
        return ReportUserDialogComponent(
          senderId: userId,
          index: 0,
        );
      },
    );

    await dialogRef.then((reason) {
      if (reason != null) {
        print('Reported user: $userId');
        final userRef = FirebaseDatabase.instance.reference().child('users');
        userRef.once().then((event) {
          var data = event.snapshot.value as Map<dynamic, dynamic>?;
          var reportedReasons = data?['reportedReasons'] != null
              ? List<String>.from(data!['reportedReasons'])
              : <String>[];
          var reportedCount =
              data?['reported'] != null ? data!['reported'] + 1 : 1;

          if (!reportedReasons.contains(reason)) {
            reportedReasons.add(reason);
          }

          if (reportedCount == 3) {
            final userRef = FirebaseDatabase.instance
                .reference()
                .child('users')
                .child(userId);
            final userEmailRef = userRef.child('email');

            userEmailRef.once().then((emailSnapshot) {
              final dataSnapshot = emailSnapshot.snapshot;
              if (dataSnapshot.exists) {
                final userEmail = dataSnapshot.value;
                final emailData = {
                  'userEmail': userEmail,
                  'reportedReasons': reportedReasons.join('\n'),
                };

                RequestService requestService = RequestService();
                requestService.postRequest('user/send-email', emailData).then(
                  (response) {
                    print('Email sent successfully: $response');
                    reportedCount = 0;
                    reportedReasons = [];
                    final updates = <String, dynamic>{
                      'reported': reportedCount,
                      'reportedReasons': reportedReasons,
                    };
                    userRef.update(updates);
                  },
                  onError: (error) {
                    print('Error sending email: $error');
                  },
                );
              } else {
                print('User email does not exist');
              }
            }).catchError((emailError) {
              print('Error fetching user email: $emailError');
            });
          } else {
            final updates = <String, dynamic>{
              'reported': reportedCount,
              'reportedReasons': reportedReasons,
            };
            userRef.update(updates);
          }
        }).then((_) {
          print('Reported user: $userId');
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('User reported successfully.')),
          );
        }).catchError((error) {
          print('Error reporting user: $error');
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Error reporting user.')),
          );
        });
      }
    });
  }

  static void deleteMatchRoom(String roomId) {
    DatabaseReference roomsRef =
        FirebaseDatabase.instance.reference().child('rooms');

    roomsRef.child(roomId).remove();
  }
}
