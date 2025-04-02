import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';
import 'package:flutterapp/classes/game_match.dart';
import 'package:flutterapp/classes/game_match_inf.dart';
import 'package:flutterapp/classes/game_session.dart';
import 'package:flutterapp/screens/FriendRequests.dart';
import 'package:flutterapp/screens/FriendSearch.dart';
import 'package:flutterapp/screens/FriendsList.dart';
import 'package:flutterapp/screens/game.dart';
import 'package:flutterapp/services/matches_info_service.dart';
import 'package:flutterapp/services/replay_service.dart';
import 'package:flutterapp/services/request_service.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../classes/game_info.dart';
import '../services/game_info_service.dart';

class AccountPage extends StatefulWidget {
  const AccountPage({Key? key}) : super(key: key);

  @override
  _AccountPageState createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _hometownController = TextEditingController();
  Map<dynamic, dynamic>? userData = <dynamic, dynamic>{};
  File? _avatarImage;
  String? _avatarUrl;
  String _errorMessage = '';
  bool _isLoading = false;
  late DatabaseReference _userRef;
  late User _user;
  // late String uid = "";
  String uid = "";
  int numberOfGamesPlayed = 0;
  int numberOfGamesWon = 0;
  int averageTimePerGame = 0;
  int averageDifferencesFoundPerGame = 0;

  List<String>? replayEvents;
  List<GameMatchInfo> matches = [];
  RequestService requestService = RequestService();

  @override
  void initState() {
    super.initState();

    _user = FirebaseAuth.instance.currentUser!;
    print("user id: ${_user.uid}");
    _userRef =
        FirebaseDatabase.instance.reference().child('users').child(_user.uid);
    _loadUserData();
    fetchStats();
  }

  Future<void> deleteReplayEvent(String uniqueId) async {
    await Firebase.initializeApp();
    final db = FirebaseDatabase.instance.reference();
    final replayEventRef = db
        .child('users')
        .child(_user.uid)
        .child('replayEvents')
        .child(uniqueId);

    replayEventRef.remove().then((_) {
      print('Replay event $uniqueId deleted successfully.');
      replayEvents?.remove(uniqueId);
      setState(() {});
    }).catchError((error) {
      print('Error deleting replay event $uniqueId: $error');
    });
  }

  Future<GameInfo?> refreshGame(String mapId) async {
    try {
      GameInfoService gameInfoService = GameInfoService();
      try {
        GameInfo gameInfo = await gameInfoService.fetchGame(mapId);
        print('Game refreshed again: $gameInfo');
        return gameInfo;
      } catch (e) {
        print('Error while fetching the game: $e');
      }
    } catch (e) {
      print(e);
    }
    return null;
  }

  void handleReplayEventClick(String uniqueId) async {
    await Firebase.initializeApp();
    final db = FirebaseDatabase.instance.reference();
    final replayEventRef = db
        .child('users')
        .child(_user.uid)
        .child('replayEvents')
        .child(uniqueId);

    replayEventRef.onValue.listen((event) async {
      final data = event.snapshot.value as Map<dynamic, dynamic>?;
      if (data != null) {
        print('Events for unique ID $uniqueId: $data');

        GameInfo? gameInfo = await refreshGame(data['mapId']);
        if (gameInfo == null) return;

        GameSession gameSession = GameSession(
            info: gameInfo,
            match: GameMatch(
                matchId: "",
                players: [],
                gameDuration: 120,
                winnerSocketId: "winner",
                cheatAllowed: false));

        ReplayService replayService = ReplayService();
        replayService.isSavedReplay = true;
        replayService.isDisplaying = true;
        replayService.startGameTime = data['startGameTime'].toDouble();
        replayService.gameTime = data['gameTime'];

        List<dynamic> rawEvents = data['events'] as List<dynamic>;
        replayService.events = rawEvents.map((eventData) {
          return ReplayEvent.fromJson(Map<String, dynamic>.from(eventData));
        }).toList();

        replayService.setBuildContext(context);

        replayService.reset();
        replayService.replay();
        replayService.pause();

        // ignore: use_build_context_synchronously
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) =>
                Game(session: gameSession, replayService: replayService),
          ),
        );
      } else {
        print('No events found for unique ID $uniqueId');
      }
    });
  }

  Future<void> _loadUserData() async {
    setState(() {
      _isLoading = true;
    });
    final dataSnapshot = await _userRef.once();
    userData = dataSnapshot.snapshot.value as Map<dynamic, dynamic>?;

    if (userData != null) {
      setState(() {
        _usernameController.text = userData?['username'] ?? '';
      });
      if (userData?['avatarUrl'] != null) {
        final url = userData?['avatarUrl'];
        try {
          setState(() {
            _avatarUrl = url;
          });
        } catch (e) {
          print('Error loading avatar image: $e');
        }
      }
      if (userData?['hometown'] != null) {
        setState(() {
          _hometownController.text = userData?['hometown'];
        });
      }
      if (userData?['replayEvents'] != null) {
        setState(() {
          replayEvents = userData?['replayEvents'].keys.cast<String>().toList();
          print('replayEvents: $replayEvents');
        });
      }
    }

    List<GameMatchInfo> fetchMatches =
        await GameMatchService().fetchGameMatches();
    setState(() {
      matches = fetchMatches;
    });
    setState(() {
      _isLoading = false;
    });
  }

  Future<void> fetchStats() async {
    final uid = _user.uid;

    if (uid == "") return;

    try {
      final response =
          await requestService.getRequest('games/history?uid=$uid');

      if (response.statusCode == 200) {
        final dynamic history = jsonDecode(response.body);

        if (history == null) {
          print('History data is null or undefined.');
          return;
        }

        if (history is List) {
          print('Game history: $history');
          setState(() {
            numberOfGamesPlayed = history.length;
            print(history.length);
            numberOfGamesWon = history.where((game) {
              return game['players'].any((player) =>
                  player['uid'] == uid &&
                  game['winnerSocketId'] == player['id']);
            }).length;

            // Additional calculations for average time per game and average differences found per game
            num totalTimePlayed = 0;
            num totalDifferencesFound = 0;
            history.forEach((game) {
              final startTime = game['startTime'];
              final endTime = game['endTime'];
              if (startTime != null && endTime != null) {
                totalTimePlayed += (endTime - startTime) /
                    1000; // Add the duration of each game
              }
              game['players'].forEach((player) {
                if (player['uid'] == uid) {
                  totalDifferencesFound += player['found'];
                }
              });
              // final player = game['players'].firstWhere(
              //     (player) => player['uid'] == uid,
              //     orElse: () => null);
              // if (player != null) {
              //   totalDifferencesFound += player[
              //       'found']; // Add the number of differences found by the player
              // }
            });
            this.averageTimePerGame =
                (totalTimePlayed ~/ this.numberOfGamesPlayed).toInt();
            this.averageDifferencesFoundPerGame =
                (totalDifferencesFound ~/ this.numberOfGamesPlayed).toInt();

            // Write the statistics to Firebase database
            if (uid.isNotEmpty) {
              DatabaseReference statsRef = FirebaseDatabase.instance
                  .reference()
                  .child('users/$uid/stats');
              statsRef.set({
                'numberOfGamesPlayed': numberOfGamesPlayed,
                'numberOfGamesWon': numberOfGamesWon,
                'averageTimePerGame': averageTimePerGame,
                'averageDifferencesFoundPerGame':
                    averageDifferencesFoundPerGame,
              });
            }
            print('Statistics fetched successfully.');
          });
        } else {
          print('Invalid history data: $history');
        }
      } else {
        print('Failed to fetch game history: ${response.statusCode}');
      }
    } catch (error) {
      print('Error fetching game history: $error');
    }
  }

  void uploadAvatar() async {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text(
              AppLocalizations.of(context)!.translate(('Choose Image Source'))),
          content: SingleChildScrollView(
            child: ListBody(
              children: <Widget>[
                GestureDetector(
                  child:
                      Text(AppLocalizations.of(context)!.translate(('Camera'))),
                  onTap: () async {
                    Navigator.of(context).pop();
                    XFile? pickedFile = await ImagePicker()
                        .pickImage(source: ImageSource.camera);
                    if (pickedFile != null) {
                      File img = File(pickedFile.path);
                      setState(() {
                        _avatarImage = img;
                      });
                    }
                  },
                ),
                const Padding(
                  padding: EdgeInsets.all(8.0),
                ),
                GestureDetector(
                  child: Text(
                      AppLocalizations.of(context)!.translate(('Gallery'))),
                  onTap: () async {
                    Navigator.of(context).pop();
                    XFile? pickedFile = await ImagePicker()
                        .pickImage(source: ImageSource.gallery);
                    if (pickedFile != null) {
                      File img = File(pickedFile.path);
                      setState(() {
                        _avatarImage = img;
                      });
                    }
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> saveUserData() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    setState(() {
      _isLoading = true;
    });
    try {
      DatabaseEvent databaseEvent = await FirebaseDatabase.instance
          .reference()
          .child('users')
          .orderByChild('username')
          .equalTo(_usernameController.text)
          .once();

      DataSnapshot dataSnapshot = databaseEvent.snapshot;
      if (dataSnapshot.value != null &&
          (dataSnapshot.value as Map<dynamic, dynamic>)[_user.uid]
                  ['username'] !=
              userData?['username']) {
        setState(() {
          _errorMessage =
              'The username ${_usernameController.text} is already taken. Please choose another one.';
        });
        return;
      }

      if (_avatarImage != null) {
        final storageRef = FirebaseStorage.instance
            .ref()
            .child('avatars/${_user.uid}/${_user.uid}.jpg');
        final uploadTask = storageRef.putFile(_avatarImage!);

        final snapshot = await uploadTask;

        final avatarUrl = await snapshot.ref.getDownloadURL();

        await _userRef.set({
          ...?userData,
          'username': _usernameController.text,
          'avatarUrl': avatarUrl,
          'hometown': _hometownController.text,
        });

        setState(() {
          _avatarUrl = avatarUrl;
        });
      } else {
        await _userRef.set({
          ...?userData,
          'username': _usernameController.text,
          'hometown': _hometownController.text,
        });
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('User data saved successfully.'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to save user data: $e'),
          backgroundColor: Colors.red,
        ),
      );
      print(e);
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)!.translate('_comment')),
        actions: [
          Row(
            children: [
              ElevatedButton.icon(
                  onPressed: () => {
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          constraints: BoxConstraints(
                            maxHeight: MediaQuery.of(context).size.height * 0.9,
                            minWidth: MediaQuery.of(context).size.width * 0.7,
                            maxWidth: MediaQuery.of(context).size.width * 0.7,
                          ),
                          builder: (BuildContext context) {
                            return const FriendSearch();
                          },
                        )
                      },
                  icon: const Icon(Icons.group_add),
                  label: Text(
                      AppLocalizations.of(context)!.translate('Search Users'))),
              const SizedBox(width: 16),
            ],
          ),
        ],
      ),
      body: Expanded(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            FloatingActionButton(
              heroTag: "1",
              onPressed: () {
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  constraints: BoxConstraints(
                    maxHeight: MediaQuery.of(context).size.height * 0.9,
                    minWidth: MediaQuery.of(context).size.width * 0.9,
                    maxWidth: MediaQuery.of(context).size.width * 0.99,
                  ),
                  builder: (BuildContext context) {
                    return SingleChildScrollView(
                      child: Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            DataTable(
                              columns: [
                                DataColumn(
                                    label: Text(AppLocalizations.of(context)!
                                        .translate('Players Names'))),
                                DataColumn(
                                    label: Text(AppLocalizations.of(context)!
                                        .translate('Initial Game Duration'))),
                                DataColumn(
                                    label: Text(AppLocalizations.of(context)!
                                        .translate('Game Mode'))),
                                DataColumn(
                                    label: Text(AppLocalizations.of(context)!
                                        .translate('Start Time'))),
                                DataColumn(
                                    label: Text(AppLocalizations.of(context)!
                                        .translate('Start Date'))),
                                DataColumn(
                                    label: Text(AppLocalizations.of(context)!
                                        .translate('Number Of Players'))),
                                DataColumn(
                                    label: Text(AppLocalizations.of(context)!
                                        .translate('Winner'))),
                                DataColumn(
                                    label: Text(AppLocalizations.of(context)!
                                        .translate('Game Time'))),
                              ],
                              rows: matches.map((GameMatchInfo match) {
                                // Assuming sorted players logic is here...

                                String winnerName =
                                    match.winnerUsername ?? 'N/A';

                                // Format gameDuration as MM:SS
                                int gameDurationMinutes =
                                    match.gameDuration != null
                                        ? match.gameDuration! ~/ 60
                                        : 0;
                                int gameDurationSeconds =
                                    match.gameDuration != null
                                        ? match.gameDuration! % 60
                                        : 0;
                                String gameDurationStr =
                                    '${gameDurationMinutes.toString().padLeft(2, '0')}:${gameDurationSeconds.toString().padLeft(2, '0')}';

                                // Calculate game time and format as MM:SS
                                String gameTimeStr = match.endTime != null
                                    ? '${match.gameTime!.inMinutes.toString().padLeft(2, '0')}:${(match.gameTime!.inSeconds % 60).toString().padLeft(2, '0')}'
                                    : 'N/A'; // If endTime is not provided, display N/A

                                return DataRow(cells: [
                                  DataCell(Text(match.players
                                      .map((p) => p.name)
                                      .join('\n'))),
                                  DataCell(Text(gameDurationStr)),
                                  DataCell(Text(match.gamemode)),
                                  DataCell(Text(DateFormat('HH:mm').format(
                                      DateTime.fromMillisecondsSinceEpoch(
                                          match.startTime)))),
                                  DataCell(Text(DateFormat('yyyy-MM-dd').format(
                                      DateTime.fromMillisecondsSinceEpoch(
                                          match.startTime)))),
                                  DataCell(
                                      Text(match.players.length.toString())),
                                  DataCell(Text(winnerName)),
                                  DataCell(Text(gameTimeStr)),
                                ]);
                              }).toList(),
                            ),
                            const SizedBox(
                                height: 20), // Extra space at the bottom
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
              tooltip: 'Game History',
              child: const Icon(Icons.history),
            ),
            Expanded(
              flex: 4,
              child: SingleChildScrollView(
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 200,
                        child: TextFormField(
                          controller: _usernameController,
                          decoration: InputDecoration(
                            labelText: AppLocalizations.of(context)!
                                .translate('Username'),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Please enter a username.';
                            }
                            return null;
                          },
                        ),
                      ),
                      const SizedBox(height: 16.0),
                      SizedBox(
                        width: 200,
                        child: TextFormField(
                          controller: _hometownController,
                          decoration: InputDecoration(
                              labelText: AppLocalizations.of(context)!
                                  .translate('Hometown')),
                        ),
                      ),
                      if (_isLoading)
                        const Padding(
                          padding: EdgeInsets.all(16.0),
                          child: Center(
                            child: CircularProgressIndicator(),
                          ),
                        ),
                      if (_errorMessage.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: Text(_errorMessage,
                              style: const TextStyle(color: Colors.red)),
                        ),
                      const SizedBox(height: 16.0),
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          CircleAvatar(
                            radius: 80,
                            backgroundColor: Colors.grey[300],
                            backgroundImage: _avatarImage != null
                                ? Image.file(_avatarImage!).image
                                : _avatarUrl != null && _avatarUrl!.isNotEmpty
                                    ? Image.network(_avatarUrl!).image
                                    : null,
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: FloatingActionButton(
                              heroTag: "2",
                              onPressed: uploadAvatar,
                              child: const Icon(Icons.camera_alt),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16.0),
                      ElevatedButton(
                          onPressed: saveUserData,
                          child: Text(
                            AppLocalizations.of(context)!.translate('Save'),
                          )),
                      const SizedBox(height: 32.0),
                      Text(
                        AppLocalizations.of(context)!.translate('Statistics'),
                        style: const TextStyle(
                            fontSize: 18.0, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16.0),
                      ListTile(
                        leading: Icon(Icons.star),
                        title: Text('Won Games: $numberOfGamesWon'),
                      ),
                      ListTile(
                        leading: Icon(Icons.view_timeline),
                        title: Text('Played Games: $numberOfGamesPlayed'),
                      ),
                      ListTile(
                        leading: Icon(Icons.key),
                        title: Text(
                            'Average of difference found per match: $averageDifferencesFoundPerGame'),
                      ),
                      ListTile(
                        leading: Icon(Icons.schedule),
                        title: Text(
                            'Average time per match: $averageTimePerGame sec'),
                      ),
                      const SizedBox(height: 32.0),
                      const Text(
                        'Replay Events:',
                        style: TextStyle(
                            fontSize: 18.0, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16.0),
                      if (replayEvents != null)
                        for (var event in replayEvents!)
                          // list with on click play and a delete button on the right side
                          ListTile(
                            leading: const Icon(Icons.play_arrow),
                            title: Text(event),
                            onTap: () {
                              print('plauing event: $event');
                              handleReplayEventClick(event);
                            },
                            trailing: IconButton(
                              icon: const Icon(Icons.delete),
                              onPressed: () {
                                // delete event
                                print('deleting event: $event');
                                deleteReplayEvent(event);
                              },
                            ),
                          ),
                    ],
                  ),
                ),
              ),
            ),
            const VerticalDivider(
              color: Colors.grey,
              thickness: 1,
              width: 1,
            ),
            Expanded(
              flex: 6,
              child: DefaultTabController(
                length: 2,
                child: Column(
                  children: [
                    TabBar(
                      tabs: [
                        Tab(
                            text: AppLocalizations.of(context)!
                                .translate('My Friends')),
                        Tab(
                            text: AppLocalizations.of(context)!
                                .translate('Friend Requests')),
                      ],
                    ),
                    const Expanded(
                      child: TabBarView(
                        children: [
                          FriendsList(),
                          FriendRequestsPage(),
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
          ],
        ),
      ),
    );
  }
}
