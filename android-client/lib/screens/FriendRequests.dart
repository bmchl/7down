import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';
import 'package:flutterapp/services/firebase_service.dart';

class FriendRequestsPage extends StatefulWidget {
  const FriendRequestsPage({Key? key}) : super(key: key);

  @override
  _FriendRequestsPageState createState() => _FriendRequestsPageState();
}

class _FriendRequestsPageState extends State<FriendRequestsPage> {
  final DatabaseReference _userRef =
      FirebaseDatabase.instance.reference().child('users');
  final String currentUserId = FirebaseAuth.instance.currentUser!.uid;

  String _errorMessage = '';
  String _successMessage = '';
  final List<Map<dynamic, dynamic>> _friendRequests = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchFriendRequests();
  }

  Future<void> _fetchFriendRequests() async {
    setState(() {
      _isLoading = true;
    });

    DatabaseEvent friendRequestsEvent =
        await _userRef.child(currentUserId).child('requests/received').once();
    DataSnapshot snapshot = friendRequestsEvent.snapshot;

    if (snapshot.value != null) {
      Map<dynamic, dynamic> requestsMap =
          snapshot.value as Map<dynamic, dynamic>;
      _friendRequests.clear();
      requestsMap.forEach((key, value) async {
        DatabaseEvent userDataEvent = await _userRef.child(key).once();
        DataSnapshot userDataSnapshot = userDataEvent.snapshot;
        if (userDataSnapshot.value != null) {
          Map<dynamic, dynamic> userData =
              userDataSnapshot.value as Map<dynamic, dynamic>;
          userData['id'] = key;
          setState(() {
            _friendRequests.add(userData);
          });
        }
      });
    }

    setState(() {
      _isLoading = false;
    });
  }

  void _acceptFriendRequest(String friendUserId) async {
    DatabaseReference userFriendListRef =
        _userRef.child(currentUserId).child('friends');
    DatabaseReference friendFriendListRef =
        _userRef.child(friendUserId).child('friends');

    await userFriendListRef.child(friendUserId).set(friendUserId);
    await friendFriendListRef.child(currentUserId).set(currentUserId);

    await FirebaseService.cleanRequests(currentUserId, friendUserId);
    final username = await FirebaseService.fetchUsername(currentUserId);

    FirebaseService.sendNotification(
      friendUserId,
      'Friend request accepted!',
      'Your friend request to $username has been accepted!',
    );

    setState(() {
      _successMessage =
          AppLocalizations.of(context)!.translate("Friend request accepted!");
      _errorMessage = '';
      _friendRequests.removeWhere((request) => request['id'] == friendUserId);
    });
  }

  void _declineFriendRequest(String friendUserId) async {
    await FirebaseService.cleanRequests(currentUserId, friendUserId);
    setState(() {
      _successMessage =
          AppLocalizations.of(context)!.translate("Friend request declined!");
      _errorMessage = '';
      _friendRequests.removeWhere((request) => request['id'] == friendUserId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_isLoading)
              const Padding(
                padding: EdgeInsets.all(16.0),
                child: Center(
                  child: CircularProgressIndicator(),
                ),
              ),
            if (_successMessage.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Text(
                  _successMessage,
                  style: const TextStyle(color: Colors.green),
                ),
              ),
            if (_friendRequests.isNotEmpty)
              Expanded(
                child: SizedBox(
                  height: MediaQuery.of(context).size.height * 0.8,
                  child: ListView.builder(
                    itemCount: _friendRequests.length,
                    itemBuilder: (BuildContext context, int index) {
                      return Card(
                        margin: const EdgeInsets.symmetric(vertical: 8.0),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundImage: NetworkImage(
                                _friendRequests[index]['avatarUrl']),
                          ),
                          title: Text(_friendRequests[index]['username'] ??
                              'No username'),
                          subtitle:
                              Text(_friendRequests[index]['hometown'] ?? ''),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.check),
                                onPressed: () {
                                  _acceptFriendRequest(
                                      _friendRequests[index]['id']);
                                },
                              ),
                              IconButton(
                                icon: const Icon(Icons.close),
                                onPressed: () {
                                  _declineFriendRequest(
                                      _friendRequests[index]['id']);
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
          // Column(
          //   children: _friendRequests.map((request) {
          //     return Card(
          //       margin: const EdgeInsets.symmetric(vertical: 8.0),
          //       child: ListTile(
          //         // hardcoded image for now, waiting for switch from base64 images to Firebase Storage in heavy client
          //         leading: const CircleAvatar(
          //           // backgroundImage: NetworkImage(user['avatarUrl'] ?? 'https://static-00.iconduck.com/assets.00/user-icon-2048x2048-ihoxz4vq.png'),
          //           backgroundImage: NetworkImage(
          //               'https://static-00.iconduck.com/assets.00/user-icon-2048x2048-ihoxz4vq.png'),
          //         ),
          //         title: Text(request['username'] ?? 'No username'),
          //         subtitle: Text(request['email'] ?? ''),
          //         trailing: Row(
          //           mainAxisSize: MainAxisSize.min,
          //           children: [
          //             IconButton(
          //               icon: const Icon(Icons.check),
          //               onPressed: () {
          //                 _acceptFriendRequest(request['id']);
          //               },
          //             ),
          //             IconButton(
          //               icon: const Icon(Icons.close),
          //               onPressed: () {
          //                 _declineFriendRequest(request['id']);
          //               },
          //             ),
          //           ],
          //         ),
          //       ),
          //     );
          //   }).toList(),
          // ),