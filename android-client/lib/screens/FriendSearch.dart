import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';
import 'package:flutterapp/screens/profile.dart';
import 'package:flutterapp/services/firebase_service.dart';

class FriendSearch extends StatefulWidget {
  const FriendSearch({Key? key}) : super(key: key);

  @override
  _FriendSearchState createState() => _FriendSearchState();
}

class _FriendSearchState extends State<FriendSearch> {
  final TextEditingController _searchController = TextEditingController();
  final DatabaseReference _userRef =
      FirebaseDatabase.instance.reference().child('users');
  final String currentUserId = FirebaseAuth.instance.currentUser!.uid;

  String _errorMessage = '';
  String _successMessage = '';
  final List<Map<dynamic, dynamic>> _users = [];
  final List<Map<dynamic, dynamic>> _filteredUsers = [];
  bool _isLoading = false;
  bool _searchByHometown = false;

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  void _fetchUsers() async {
    setState(() {
      _isLoading = true;
      _users.clear();
    });
    try {
      DatabaseEvent dbEvent = await _userRef.once();
      DataSnapshot snapshot = dbEvent.snapshot;
      (snapshot.value as Map<dynamic, dynamic>).forEach((key, value) {
        setState(() {
          _users.add({
            'id': key,
            'username': value['username'] ?? 'No username',
            'email': value['email'] ?? 'No email',
            'avatarUrl': value['avatarUrl'] ?? '',
            'hometown': value['hometown'] ?? 'unknown hometown',
          });
        });
      });
    } catch (error) {
      print('Error fetching users: $error');
      setState(() {
        _errorMessage = 'Error fetching users. Please try again.';
      });
    } finally {
      setState(() {
        _filteredUsers.clear();
        _filteredUsers.addAll(_users);
        _isLoading = false;
      });
    }
  }

  void _searchUsersByHometown(String hometownQuery) {
    setState(() {
      _filteredUsers.clear();
      _filteredUsers.addAll(_users.where((user) => user['hometown']
          .toString()
          .toLowerCase()
          .contains(hometownQuery.toLowerCase())));
    });
  }

  void _searchUsers(String query) {
    setState(() {
      _filteredUsers.clear();
      _filteredUsers.addAll(_users
          .where((user) => user['username']
              .toString()
              .toLowerCase()
              .contains(query.toLowerCase()))
          .toList());
    });
  }

  void _searchForFriend(String query) async {
    if (query.isEmpty) {
      setState(() {
        _filteredUsers.clear();
        _filteredUsers.addAll(_users);
        _errorMessage = '';
        _successMessage = '';
      });
      return;
    }

    _searchByHometown ? _searchUsersByHometown(query) : _searchUsers(query);

    DatabaseEvent dataEvent =
        await _userRef.orderByChild('username').equalTo(query).once();

    DataSnapshot dataSnapshot = dataEvent.snapshot;

    if (dataSnapshot.value == null) {
      setState(() {
        _errorMessage =
            AppLocalizations.of(context)!.translate("No user found");
        _successMessage = '';
      });
      return;
    } else {
      setState(() {
        _errorMessage = '';
        _successMessage = '';
      });
    }
  }

  Future<bool> _checkIfFriend(String userId) async {
    DatabaseEvent dbEvent = await _userRef
        .child(currentUserId)
        .child('friends')
        .child(userId)
        .once();
    DataSnapshot snapshot = dbEvent.snapshot;
    return snapshot.value != null;
  }

  Future<void> _sendFriendRequest(String friendUserId) async {
    bool isFriend = await _checkIfFriend(friendUserId);

    if (isFriend) {
      setState(() {
        _errorMessage = AppLocalizations.of(context)!.translate(
            "User is already your friend"); //he sent you a friend request (you didn't) and it was accepted
        _successMessage = '';
      });
      return;
    }
    DatabaseReference userSentRequestsRef =
        _userRef.child(currentUserId).child('requests/sent');
    String newChildKey = friendUserId;
    await userSentRequestsRef.child(newChildKey).set(friendUserId);

    DatabaseReference friendRequestsRef =
        _userRef.child(friendUserId).child('requests/received');
    String newChild = currentUserId;
    await friendRequestsRef.child(newChild).set(currentUserId);
    final username = await FirebaseService.fetchUsername(
        FirebaseAuth.instance.currentUser!.uid);

    // send notification
    FirebaseService.sendNotification(
      friendUserId,
      'Friend Request',
      'You have a new friend request from $username',
    );

    setState(() {
      _successMessage = AppLocalizations.of(context)!
          .translate("Friend request sent successfully!");
      _errorMessage = '';
    });
  }

  void _blockUser(String userId) async {
    try {
      await _userRef
          .child(currentUserId)
          .child('blocked')
          .child(userId)
          .set(true);
      await _userRef
          .child(userId)
          .child('blocked')
          .child(currentUserId)
          .set(true);

      await FirebaseService.removeFriend(currentUserId, userId);

      await FirebaseService.cleanRequests(currentUserId, userId);
      setState(() {
        _successMessage = AppLocalizations.of(context)!
            .translate("User blocked successfully!");
        _errorMessage = '';
      });
    } catch (error) {
      print('Error blocking user: $error');
      setState(() {
        _errorMessage = 'Error blocking user. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          title: Text(AppLocalizations.of(context)!.translate('Search Users'))),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onChanged: (value) => _searchForFriend(value),
                    decoration: InputDecoration(
                      labelText: _searchByHometown
                          ? AppLocalizations.of(context)!
                              .translate('Hometown input')
                          : AppLocalizations.of(context)!
                              .translate('Username input'),
                      errorText:
                          _errorMessage.isNotEmpty ? _errorMessage : null,
                    ),
                  ),
                ),
              ],
            ),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _searchByHometown = !_searchByHometown;
                  _errorMessage = '';
                });
                _searchForFriend(_searchController.text);
              },
              child: Text(_searchByHometown
                  ? AppLocalizations.of(context)!
                      .translate('Search by username')
                  : AppLocalizations.of(context)!
                      .translate('Search by hometown')),
            ),
            if (_successMessage.isNotEmpty)
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: Text(
                  _successMessage,
                  style: const TextStyle(color: Colors.green),
                ),
              ),
            if (_isLoading)
              const Padding(
                padding: EdgeInsets.all(16.0),
                child: Center(
                  child: CircularProgressIndicator(),
                ),
              ),
            const SizedBox(height: 20),
            const Text(
              'Profiles:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            if (_filteredUsers.isNotEmpty)
              Column(
                children: _filteredUsers
                    .where((user) => user['id'] != currentUserId)
                    .map((user) {
                  DatabaseReference requestSentRef = _userRef
                      .child(currentUserId)
                      .child('requests/sent')
                      .child(user['id']);

                  DatabaseReference blockedRef = _userRef
                      .child(currentUserId)
                      .child('blocked')
                      .child(user['id']);

                  return FutureBuilder(
                    future: blockedRef.once().then((event) => event.snapshot),
                    builder:
                        (context, AsyncSnapshot<DataSnapshot> blockedSnapshot) {
                      if (blockedSnapshot.connectionState ==
                          ConnectionState.waiting) {
                        return const CircularProgressIndicator();
                      } else if (blockedSnapshot.hasData &&
                          blockedSnapshot.data!.value != null &&
                          blockedSnapshot.data!.value != false) {
                        return Container();
                      } else {
                        return FutureBuilder<DataSnapshot>(
                          future: requestSentRef
                              .once()
                              .then((event) => event.snapshot),
                          builder: (context,
                              AsyncSnapshot<DataSnapshot> requestSnapshot) {
                            if (requestSnapshot.connectionState ==
                                ConnectionState.waiting) {
                              return const CircularProgressIndicator();
                            } else {
                              bool requestSent = requestSnapshot.hasData &&
                                  requestSnapshot.data!.value != null;

                              return Card(
                                margin:
                                    const EdgeInsets.symmetric(vertical: 8.0),
                                child: ListTile(
                                  onTap: () => showModalBottomSheet(
                                      context: context,
                                      isScrollControlled: true,
                                      constraints: BoxConstraints(
                                        maxHeight:
                                            MediaQuery.of(context).size.height *
                                                0.9,
                                        minWidth:
                                            MediaQuery.of(context).size.width *
                                                0.7,
                                        maxWidth:
                                            MediaQuery.of(context).size.width *
                                                0.7,
                                      ),
                                      builder: (context) => Expanded(
                                          child: Profile(uid: user['id']))),
                                  leading: CircleAvatar(
                                    radius: 30,
                                    backgroundImage:
                                        Image.network(user['avatarUrl']).image,
                                  ),
                                  title:
                                      Text(user['username'] ?? 'No username'),
                                  subtitle: Text(
                                      user['hometown'] ?? 'unknown hometown'),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      ElevatedButton(
                                        onPressed: () {
                                          if (!requestSent) {
                                            _sendFriendRequest(user['id']);
                                          }
                                        },
                                        child: Text(requestSent
                                            ? AppLocalizations.of(context)!
                                                .translate("sent")
                                            : AppLocalizations.of(context)!
                                                .translate("Add")),
                                      ),
                                      const SizedBox(width: 10),
                                      ElevatedButton(
                                        onPressed: () {
                                          showDialog(
                                            context: context,
                                            builder: (context) => AlertDialog(
                                              title: Text(
                                                  AppLocalizations.of(context)!
                                                      .translate("Block User")),
                                              content: Text(AppLocalizations.of(
                                                      context)!
                                                  .translate(
                                                      "Block User Confirmation")),
                                              actions: [
                                                TextButton(
                                                  onPressed: () {
                                                    Navigator.of(context).pop();
                                                  },
                                                  child: Text(
                                                      AppLocalizations.of(
                                                              context)!
                                                          .translate("Cancel")),
                                                ),
                                                TextButton(
                                                  onPressed: () {
                                                    _blockUser(user['id']);
                                                    Navigator.of(context).pop();
                                                  },
                                                  child: Text(
                                                      AppLocalizations.of(
                                                              context)!
                                                          .translate("Block")),
                                                ),
                                              ],
                                            ),
                                          );
                                        },
                                        child: Text(
                                            AppLocalizations.of(context)!
                                                .translate("Block")),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }
                          },
                        );
                      }
                    },
                  );
                }).toList(),
              ),
          ],
        ),
      ),
    );
  }
}
