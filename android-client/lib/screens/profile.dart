import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';
import 'package:flutterapp/classes/environment.dart';
import 'package:flutterapp/classes/game_info.dart';
import 'package:flutterapp/services/firebase_service.dart';
import 'package:flutterapp/services/game_info_service.dart';

class Profile extends StatefulWidget {
  final String uid;
  const Profile({super.key, required this.uid});

  @override
  _ProfileState createState() => _ProfileState(uid: uid);
}

class _ProfileState extends State<Profile> {
  final String uid;
  _ProfileState({required this.uid});
  final DatabaseReference _userRef =
      FirebaseDatabase.instance.reference().child('users');

  late DatabaseReference _profileRef;
  late User _user;
  String? _avatarUrl;
  Map<dynamic, dynamic>? profileData;
  bool _isLoading = false;

  List<GameInfo> _games = [];
  final List<Map<dynamic, dynamic>> _friends = [];
  final String currentUserId = FirebaseAuth.instance.currentUser!.uid;
  String? _successMessage;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _user = FirebaseAuth.instance.currentUser!;
    _profileRef =
        FirebaseDatabase.instance.reference().child('users').child(uid);
    _loadProfileData();
    getGames();
  }

  Future<void> getGames() async {
    List<GameInfo> gamesRes = [];
    try {
      GameInfoService gameInfoService = GameInfoService();
      gamesRes = await gameInfoService.fetchGamesByCreator(uid);
      setState(() {
        _games = gamesRes;
      });
    } catch (e) {
      print(e);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Error fetching games'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _loadProfileData() async {
    setState(() {
      _isLoading = true;
    });
    final dataSnapshot = await _profileRef.once();
    profileData = dataSnapshot.snapshot.value as Map<dynamic, dynamic>?;

    if (profileData != null) {
      if (profileData?['avatarUrl'] != null) {
        final url = profileData?['avatarUrl'];
        try {
          setState(() {
            _avatarUrl = url;
          });
        } catch (e) {
          print('Error loading avatar image: $e');
        }
      }
    }

    await _fetchFriends();

    setState(() {
      _isLoading = false;
    });
  }

  Future<void> _fetchFriends() async {
    setState(() {
      _isLoading = true;
    });

    final friendsEvent = await _userRef.child(uid).child('friends').once();
    final snapshot = friendsEvent.snapshot;

    if (snapshot.value != null) {
      final friendsMap = snapshot.value as Map<dynamic, dynamic>;
      final List<Map<dynamic, dynamic>> loadedFriends = [];

      for (final key in friendsMap.keys) {
        final userDataEvent = await _userRef.child(key).once();
        final userDataSnapshot = userDataEvent.snapshot;

        if (userDataSnapshot.value != null) {
          final userData = userDataSnapshot.value as Map<dynamic, dynamic>;
          userData['id'] = key;
          loadedFriends.add(userData);
        }
      }

      setState(() {
        _friends.clear();
        _friends.addAll(loadedFriends);
        _isLoading = false;
      });
    } else {
      setState(() {
        _isLoading = false;
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

    if (currentUserId == friendUserId) {
      setState(() {
        _errorMessage = 'You cannot send a friend request to yourself.';
        _successMessage = '';
      });
      return;
    }

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
      AppLocalizations.of(context)!
          .translate("Friend request sent successfully!");
      _errorMessage = '';
    });
  }

  void _blockUser(String userId) async {
    if (currentUserId == userId) {
      setState(() {
        _errorMessage = 'You cannot block yourself.';
        _successMessage = '';
      });
      return;
    }
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
        title: Text(AppLocalizations.of(context)!.translate("Profile Infos")),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 50,
                        backgroundImage: _avatarUrl != null
                            ? Image.network(_avatarUrl!).image
                            : Image.network(
                                    '${Environment.serverUrl}/assets/monkey4.png')
                                .image,
                      ),
                      const SizedBox(width: 20),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            profileData?['username'] ?? '',
                            style: const TextStyle(fontSize: 20),
                          ),
                          Text(
                            profileData?['hometown'] ?? '',
                            style: const TextStyle(fontSize: 20),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  if (_successMessage != null)
                    Text(
                      _successMessage!,
                      style: const TextStyle(color: Colors.green),
                    ),
                  if (_errorMessage != null)
                    Text(
                      _errorMessage!,
                      style: const TextStyle(color: Colors.red),
                    ),
                  const Divider(),
                  const SizedBox(height: 20),
                  Text(
                    AppLocalizations.of(context)!.translate("Friends of User"),
                    style: const TextStyle(
                        fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  Expanded(
                    child: (_friends.isNotEmpty
                        ? ListView.builder(
                            itemCount: _friends.length,
                            itemBuilder: (context, index) {
                              final friend = _friends[index];
                              return Card(
                                margin:
                                    const EdgeInsets.symmetric(vertical: 8.0),
                                child: ListTile(
                                  leading: CircleAvatar(
                                    backgroundImage:
                                        NetworkImage(friend['avatarUrl']),
                                  ),
                                  title: Text(friend['username']),
                                  subtitle: Text(friend['hometown']),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      ElevatedButton(
                                        onPressed: () {
                                          _sendFriendRequest(friend['id']);
                                        },
                                        child: Text(
                                            AppLocalizations.of(context)!
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
                                                      Navigator.of(context)
                                                          .pop();
                                                    },
                                                    child: Text(AppLocalizations
                                                            .of(context)!
                                                        .translate("Cancel"))),
                                                TextButton(
                                                  onPressed: () {
                                                    _blockUser(friend['id']);
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
                            },
                          )
                        : Center(
                            child: Text(AppLocalizations.of(context)!
                                .translate("No friends")))),
                  ),
                ],
              ),
            ),
    );
  }
}
