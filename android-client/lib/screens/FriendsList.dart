import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/services/firebase_service.dart';

class FriendsList extends StatefulWidget {
  const FriendsList({Key? key}) : super(key: key);

  @override
  _FriendsListState createState() => _FriendsListState();
}

class _FriendsListState extends State<FriendsList> {
  final DatabaseReference _userRef =
      FirebaseDatabase.instance.reference().child('users');
  final String currentUserId = FirebaseAuth.instance.currentUser!.uid;

  String _errorMessage = '';
  final List<Map<dynamic, dynamic>> _friends = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchFriends();
  }

  Future<void> _fetchFriends() async {
    setState(() {
      _isLoading = true;
    });

    List<Map<dynamic, dynamic>> friendsList =
        await FirebaseService.getFriends(currentUserId);

    setState(() {
      _friends.clear();
      _friends.addAll(friendsList);
      _isLoading = false;
    });
  }

  void removeFriend(String friendId) async {
    try {
      await FirebaseService.removeFriend(currentUserId, friendId);

      setState(() {
        _friends.removeWhere((friend) => friend['id'] == friendId);
      });
    } catch (error) {
      setState(() {
        _errorMessage = 'Error removing friend: $error';
      });
    }
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
            if (_friends.isNotEmpty)
              ListView.builder(
                shrinkWrap: true,
                itemCount: _friends.length,
                itemBuilder: (BuildContext context, int index) {
                  return Card(
                    margin: const EdgeInsets.symmetric(vertical: 8.0),
                    child: ListTile(
                      leading: CircleAvatar(
                        radius: 30,
                        backgroundImage:
                            NetworkImage(_friends[index]['avatarUrl']),
                      ),
                      title: Text(_friends[index]['username'] ?? 'No username'),
                      subtitle: Text(_friends[index]['hometown'] ?? ''),
                      trailing: IconButton(
                        icon: const Icon(Icons.remove),
                        onPressed: () => removeFriend(_friends[index]['id']),
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
          // Column(
          //   children: _friends.map((friend) {
          //     return Card(
          //       margin: const EdgeInsets.symmetric(vertical: 8.0),
          //       child: ListTile(
          //         // hardcoded image for now, waiting for switch from base64 images to Firebase Storage in heavy client
          //         leading: const CircleAvatar(
          //           // backgroundImage: NetworkImage(user['avatarUrl'] ?? 'https://static-00.iconduck.com/assets.00/user-icon-2048x2048-ihoxz4vq.png'),
          //           backgroundImage: NetworkImage(
          //               'https://static-00.iconduck.com/assets.00/user-icon-2048x2048-ihoxz4vq.png'),
          //         ),
          //         title: Text(friend['username'] ?? 'No username'),
          //         subtitle: Text(friend['email'] ?? ''),
          //         trailing: IconButton(
          //           icon: const Icon(Icons.remove),
          //           onPressed: () => _removeFriend(friend['id']),
          //         ),
          //       ),
          //     );
          //   }).toList(),
          // ),