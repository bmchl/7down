import 'dart:async';
import 'dart:core';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';
import 'package:flutterapp/classes/environment.dart';
import 'package:flutterapp/classes/game_info.dart';
import 'package:flutterapp/classes/game_match.dart';
import 'package:flutterapp/classes/game_session.dart';
import 'package:flutterapp/classes/like.dart';
import 'package:flutterapp/classes/player.dart';
import 'package:flutterapp/components/chat_drawer.dart';
import 'package:flutterapp/components/difficulty_meter.dart';
import 'package:flutterapp/screens/auth_wrapper.dart';
import 'package:flutterapp/screens/game.dart';
import 'package:flutterapp/screens/profile.dart';
import 'package:flutterapp/services/firebase_service.dart';
import 'package:flutterapp/services/game_info_service.dart';
import 'package:flutterapp/services/replay_service.dart';
import 'package:flutterapp/services/socket_client_service.dart';

class Comment {
  final String id;
  final String text;
  final String author;
  final String date;
  String profilePic = '${Environment.serverUrl}/assets/monkey4.png';

  Comment({
    required this.id,
    required this.text,
    required this.author,
    required this.date,
  });
}

class DetailSheet extends State<Detail> {
  GameInfo gameInfo;
  SocketClientService socketService = SocketClientService();
  List<GameMatch> matches = [];
  List<GameMatch> filteredMatches = [];
  GameMatch currentMatch = GameMatch(
      matchId: '',
      mapId: '',
      players: [],
      gameDuration: 0,
      cheatAllowed: false);
  bool roomsAreLoading = true; // Added loading indicator state

  Map<dynamic, dynamic>? userData = <dynamic, dynamic>{};
  late DatabaseReference _userRef;
  late User _user;
  bool _isLoading = false;
  final String _errorMessage = '';
  LobbyCreationOption visibility = LobbyCreationOption.allUsers;
  TextEditingController durationController = TextEditingController(text: '120');
  bool cheatAllowed = false;

  Color likeButtonColor = Colors.grey;
  Color dislikeButtonColor = Colors.grey;

  @override
  void initState() {
    super.initState();
    _user = FirebaseAuth.instance.currentUser!;
    _userRef =
        FirebaseDatabase.instance.reference().child('users').child(_user.uid);
    _loadUserData();
    connectAndSetupSocket();
  }

  Future<void> _loadUserData() async {
    setState(() {
      _isLoading = true;
    });
    final dataSnapshot = await _userRef.once();
    userData = dataSnapshot.snapshot.value as Map<dynamic, dynamic>?;

    if (userData != null) {
      // game likes will contain a map of <gameId>: <like> with like being 1 if liked, 0 if disliked and null if not liked

      if (userData?['gameLikes'] != null) {
        final likes = userData?['gameLikes'];

        if (likes[gameInfo.id] != null) {
          final like = likes[gameInfo.id];
          if (like == 1) {
            gameInfo.setLike(Like.like);
            likeButtonColor = Colors.green.shade700;
          } else if (like == 0) {
            gameInfo.setLike(Like.dislike);
            dislikeButtonColor = Colors.red.shade700;
          }
        }
      }
    }
    setState(() {
      _isLoading = false;
    });
  }

  void _likeGame() async {
    print('like game, ${gameInfo.like}');
    if (gameInfo.like == Like.like) {
      likeButtonColor = Colors.grey;
      gameInfo.setLike(Like.none);
      _userRef.child('gameLikes').update({gameInfo.id: null});
      socketService
          .send('dislike-game', {'uid': _user.uid, 'gameId': gameInfo.id});
    } else if (gameInfo.like == Like.dislike) {
      dislikeButtonColor = Colors.grey;
      likeButtonColor = Colors.green.shade700;
      gameInfo.setLike(Like.like);
      _userRef.child('gameLikes').update({gameInfo.id: 1});
      socketService
          .send('like-game', {'uid': _user.uid, 'gameId': gameInfo.id});
      socketService
          .send('like-game', {'uid': _user.uid, 'gameId': gameInfo.id});
    } else {
      likeButtonColor = Colors.green.shade700;
      gameInfo.setLike(Like.like);
      _userRef.child('gameLikes').update({gameInfo.id: 1});
      socketService
          .send('like-game', {'uid': _user.uid, 'gameId': gameInfo.id});
    }
    final username = await FirebaseService.fetchUsername(_user.uid);
    FirebaseService.sendNotification(
      gameInfo.creator,
      'Your game ${gameInfo.name} has been liked!',
      'Liked by $username',
    );
  }

  void _dislikeGame() async {
    if (gameInfo.like == Like.dislike) {
      dislikeButtonColor = Colors.grey;
      gameInfo.setLike(Like.none);
      _userRef.child('gameLikes').update({gameInfo.id: null});
      socketService
          .send('like-game', {'uid': _user.uid, 'gameId': gameInfo.id});
    } else if (gameInfo.like == Like.like) {
      likeButtonColor = Colors.grey;
      dislikeButtonColor = Colors.red.shade700;
      gameInfo.setLike(Like.dislike);
      _userRef.child('gameLikes').update({gameInfo.id: 0});
      socketService
          .send('dislike-game', {'uid': _user.uid, 'gameId': gameInfo.id});
      socketService
          .send('dislike-game', {'uid': _user.uid, 'gameId': gameInfo.id});
    } else {
      gameInfo.setLike(Like.dislike);
      dislikeButtonColor = Colors.red.shade700;
      _userRef.child('gameLikes').update({gameInfo.id: 0});
      socketService
          .send('dislike-game', {'uid': _user.uid, 'gameId': gameInfo.id});
    }
    final username = await FirebaseService.fetchUsername(_user.uid);
    FirebaseService.sendNotification(
      gameInfo.creator,
      'Your game ${gameInfo.name} has been disliked!',
      'Disliked by $username',
    );
  }

  List<Comment> placeholderComments = [
    Comment(
      id: '1',
      text: 'This game is awesome!',
      author: 'John Doe',
      date: '2021/10/01 12:00',
    ),
    Comment(
      id: '2',
      text: 'I love this game!',
      author: 'Jane Doe',
      date: '2021/10/01 12:00',
    ),
    Comment(
      id: '3',
      text: 'This game is the best!',
      author: 'John Smith',
      date: '2021/10/01 12:00',
    ),
    Comment(
      id: '4',
      text: 'Dad left us',
      author: 'Spongebob baby',
      date: '2021/10/01 12:00',
    ),
  ];

  DetailSheet({required this.gameInfo});

  bool isCreator() {
    bool isCreator = false;
    if (currentMatch.players.isNotEmpty) {
      isCreator = currentMatch.players
          .where((player) => player.id == socketService.socket?.id)
          .first
          .creator;
    }
    return isCreator;
  }

  Future<void> connectAndSetupSocket() async {
    await socketService.connect();

    socketService.on('refresh-games', (data) {
      // Fetch the games again
      // You can call the getGames method from the SelectionPage state
      refreshGame();
    });
    socketService.on<Map<String, dynamic>>(
      'update-awaiting-matches',
      (data) {
        if (data.isNotEmpty) {
          String mapId = data['map'] ?? '';
          List<dynamic> matchesData = data['matches'];
          if (mapId != gameInfo.id) {
            return;
          }

          List<GameMatch> newMatches = [];
          for (dynamic match in matchesData) {
            if (match != null && match['startTime'] == 0) {
              List<dynamic> playersData = match['players'] ?? [];
              List<Player> players = [];
              // Check if 'players' is not null and is a list before mapping
              for (dynamic player in playersData) {
                players.add(Player(
                  id: player['id'],
                  uid: player['uid'],
                  name: player['name'],
                  profilePic: player['profilePic'],
                  creator: player['creator'] ?? false,
                ));
              }

              GameMatch gameMatch = GameMatch(
                  matchId: match['matchId'],
                  mapId: mapId,
                  players: players,
                  startTime: match['startTime'],
                  visibility: match['visibility'],
                  gameDuration: match['gameDuration'],
                  cheatAllowed: match['cheatAllowed']);

              newMatches.add(gameMatch);
            }
          }
          print(newMatches);
          setMatches(mapId, newMatches);
        } else {
          socketService.send('c/get-lobbies', {'mapId': gameInfo.id});
          // display snackbar with error message
          SnackBar snackBar = const SnackBar(
            content: Text('Error fetching matches. Fetching again...'),
          );
          ScaffoldMessenger.of(context).showSnackBar(snackBar);
        }
      },
    );

    socketService.on<Map<String, dynamic>>(
      'update-match-info',
      (data) {
        if (data.isNotEmpty) {
          String mapId = data['match']['mapId'] ?? '';
          String matchId = data['match']['matchId'] ?? '';
          List<dynamic> playersData = data['match']['players'];

          print("AA - mapId: $mapId, gameInfo.id: ${gameInfo.id}");

          if (mapId != gameInfo.id) {
            return;
          }

          List<Player> players = [];
          if (playersData.isNotEmpty) {
            for (dynamic player in playersData) {
              players.add(Player(
                id: player['id'],
                uid: player['uid'],
                name: player['name'],
                profilePic: player['profilePic'],
                creator: player['creator'] ?? false,
              ));
            }
          }

          GameMatch updatedMatch = GameMatch(
              matchId: matchId,
              mapId: mapId,
              players: players,
              gameDuration: data['match']['gameDuration'],
              cheatAllowed: data['match']['cheatAllowed']);

          print("AA - matches: ${matches[0].matchId}");
          print("AA - matchId: $matchId");

          int index = matches.indexWhere((match) => match.matchId == matchId);

          setState(() {
            if (index != -1) {
              // If the match is already in the list, update it
              matches[index] = updatedMatch;
              print('AA - updated match');
            } else {
              // If the match is not in the list, add it
              print('AA - added match');
              matches.add(updatedMatch);
            }

            // Update the current match
            currentMatch = matches.firstWhere(
              (match) => match.players
                  .map((player) => player.id)
                  .contains(socketService.socket?.id),
              orElse: () => currentMatch,
            );
          });

          // if players length is 1, then the creator has left the room
          if (players.length > 1) {
            if (isCreator()) {
              FirebaseService.ensureParticipantInRoom(matchId, _user.uid);
            } else {
              Timer(const Duration(seconds: 2), () {
                FirebaseService.ensureParticipantInRoom(matchId, _user.uid);
              });
            }
          }
        }
      },
    );

    socketService.on<Map<String, dynamic>>('game-started', (data) async {
      if (data.isNotEmpty) {
        String matchId = data['match']['matchId'] ?? '';
        List<dynamic> playersData = data['match']['players'];
        int startTime = data['match']['startTime'];
        String gameMode = data['match']['gamemode'];
        String id = data['match']['_id'];

        if (matchId != currentMatch.matchId) return;

        List<Player> players = [];
        if (playersData.isNotEmpty) {
          for (dynamic player in playersData) {
            players.add(Player(
              id: player['id'],
              uid: player['uid'],
              name: player['name'],
              profilePic: player['profilePic'],
              creator: player['creator'] ?? false,
            ));
          }
        }

        await refreshGame();

        setState(() {
          currentMatch = GameMatch(
              matchId: matchId,
              mapId: gameInfo.id,
              players: players,
              startTime: startTime,
              gameDuration: data['match']['gameDuration'],
              cheatAllowed: data['match']['cheatAllowed']);
        });

        GameSession session = GameSession(
          info: gameInfo,
          match: currentMatch,
          mode: gameMode,
          id: id,
        );

        ReplayService replayService = ReplayService();

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) =>
                Game(session: session, replayService: replayService),
          ),
        ).then((value) {
          setState(() {
            currentMatch = GameMatch(
                matchId: '',
                mapId: '',
                players: [],
                gameDuration: 0,
                cheatAllowed: false);
          });
          Navigator.of(context).pop();
        });
      }
    });
    socketService.send('c/get-lobbies', {'mapId': gameInfo.id});
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

  @override
  void dispose() {
    // Disconnect the socket and remove all listeners when the state is disposed
    print('disconnecting');
    if (currentMatch.matchId != '') {
      socketService.send('c/leave-lobby', {'matchId': currentMatch.matchId});
      FirebaseService.leaveMatchRoom(currentMatch.matchId, _user.uid);
    }
    socketService.removeAllListeners();

    super.dispose();
  }

  Future<void> refreshGame() async {
    try {
      // Fetch the games again
      // You can call the getGames method from the SelectionPage state
      GameInfoService gameInfoService = GameInfoService();
      GameInfo gameRes = gameInfo;
      try {
        gameRes = await gameInfoService.fetchGame(gameInfo.id);
        print('Game refreshed: ${gameRes.toString()}');
        setState(() {
          gameInfo = gameRes;
          print('Game refreshed again: $gameInfo');
        });
      } catch (e) {
        print('Error while fetching the game: $e');
        // Handle the error or retry the fetch operation
      }
    } catch (e) {
      print(e);
      setState(() {
        // Display snackbar with error message
        SnackBar snackBar = const SnackBar(
          content: Text('Error fetching game. Please try again.'),
        );
        ScaffoldMessenger.of(context).showSnackBar(snackBar);
      });
    }
  }

  void leaveLobby() async {
    await FirebaseService.leaveMatchRoom(currentMatch.matchId, _user.uid);

    socketService.send('c/leave-lobby', {'matchId': currentMatch.matchId});
    setState(() {
      currentMatch = GameMatch(
          matchId: '',
          mapId: '',
          players: [],
          gameDuration: 0,
          cheatAllowed: false);
    });
  }

  void startGame() {
    socketService.send('c/start-game', {'matchId': currentMatch.matchId});
  }

  void joinLobby(GameMatch match) {
    socketService.send('c/join-lobby', {'matchId': match.matchId});
  }

  void setMatches(String mapId, List<GameMatch> newMatches) {
    print('Setting matches for map: $mapId');
    setState(() {
      matches = newMatches;
      roomsAreLoading = false;
      currentMatch = matches.firstWhere(
          (match) => match.players
              .map((player) => player.id)
              .contains(socketService.socket?.id),
          orElse: () => currentMatch);
    });
    findOpenMatches(matches);
  }

  Future<void> findOpenMatches(List<GameMatch> matches) async {
    final tempMatches = <GameMatch>[];

    setState(() {
      filteredMatches = [];
    });

    for (final match in matches) {
      if ((match.visibility == null) && match.startTime == 0) {
        tempMatches.add(match);
      } else {
        final creatorId = match.players
            .firstWhere(
              (player) => player.creator,
            )
            .uid;

        List<Map<dynamic, dynamic>> friends =
            await FirebaseService.getFriends(creatorId);
        final friendsOfFriends = <String>[];

        if (match.visibility == 'friendsOfFriends') {
          for (final friend in friends) {
            final friendFriends =
                await FirebaseService.getFriends(friend['id']);
            friendsOfFriends
                .addAll(friendFriends.map((friend) => friend['id']));
          }
        }

        final isFriend =
            friends.map((friend) => friend['id']).contains(_user.uid) ||
                friendsOfFriends.contains(_user.uid);

        if (isFriend) {
          tempMatches.add(match);
        }
      }

      final blockedUids = await FirebaseService.getBlockedUsers(_user.uid);
      tempMatches.removeWhere((match) =>
          match.players.any((player) => blockedUids.contains(player.uid)));
    }
    setState(() {
      filteredMatches = tempMatches;
    });
  }

  // List<GameMatch> findOpenMatches(List<GameMatch> matches) {
  //   return matches.where((match) => match.startTime == 0).toList();
  // }

  // void updateMatchInfo(Map<String, dynamic> data) {
  //   if (data['match']['mapId'] != gameInfo.id) return;

  //   int index = matches
  //       .indexWhere((match) => match.matchId == data['match']['matchId']);
  //   if (index != -1) {
  //     setState(() {
  //       matches[index] = GameMatch(
  //         matchId: data['match']['matchId'],
  //         mapId: gameInfo.id,
  //         players: data['match']['players'] != null
  //             ? data['match']['players'].map((player) =>
  //                 Player(id: player['id'], creator: player['creator']))
  //             : <Player>[],
  //       );
  //       currentMatch = matches.firstWhere(
  //         (match) => match.players.contains(socketService.id),
  //         orElse: () => currentMatch,
  //       );
  //     });
  //   } else {
  //     setState(() {
  //       matches.add(
  //         GameMatch(
  //           matchId: data['match']['matchId'],
  //           mapId: gameInfo.id,
  //           players: data['match']['players'] != null
  //               ? data['match']['players'].map((player) =>
  //                   Player(id: player['id'], creator: player['creator']))
  //               : <Player>[],
  //         ),
  //       );
  //       currentMatch = matches.firstWhere(
  //         (match) => match.players
  //             .map((player) => player.id)
  //             .contains(socketService.id),
  //         orElse: () => currentMatch,
  //       );
  //     });
  //   }
  // }

  // void gameStarted(Map<String, dynamic> data) {
  //   if (data['match']['matchId'] != currentMatch?.matchId) return;

  //   setState(() {
  //     currentMatch = GameMatch(
  //       matchId: data['match']['matchId'],
  //       mapId: gameInfo.id,
  //       players: data['match']['players'] != null
  //           ? data['match']['players'].map((player) =>
  //               Player(id: player['id'], creator: player['creator']))
  //           : <Player>[],
  //     );
  //   });

  //   Navigator.push(
  //     context,
  //     MaterialPageRoute(
  //       builder: (context) => Game(
  //         match: currentMatch,
  //         gameInfo: gameInfo,
  //       ),
  //     ),
  //   );
  // }

  final GlobalKey<ScaffoldState> scaffoldKey = GlobalKey<ScaffoldState>();

  void openDrawer() {
    scaffoldKey.currentState!.openEndDrawer();
  }

  @override
  Widget build(BuildContext context) {
    // Implement the UI for the game detail screen
    return Scaffold(
        key: scaffoldKey,
        endDrawer: const AuthenticationWrapper(child: ChatDrawer()),
        appBar: AppBar(
          actions: <Widget>[Container()],
          leading: BackButton(
            onPressed: () {
              // Navigator.pushReplacement(
              //   context,
              //   MaterialPageRoute(
              //     builder: (context) => const NavRailExample(),
              //   ),
              // );
              Navigator.of(context).pop();
            },
          ),
          title: Text(AppLocalizations.of(context)!.translate('Game Detail')),
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: openDrawer,
          child: const Icon(Icons.chat),
        ),
        body: SafeArea(
          bottom: false,
          top: false,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: SizedBox(
                      height: 320,
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            gameInfo.name,
                                            style: const TextStyle(
                                              fontSize: 24.0,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          GestureDetector(
                                            child: Row(
                                              children: [
                                                GestureDetector(
                                                  onTap: () {
                                                    showModalBottomSheet(
                                                        context: context,
                                                        isScrollControlled:
                                                            true,
                                                        constraints:
                                                            BoxConstraints(
                                                          maxHeight:
                                                              MediaQuery.of(
                                                                          context)
                                                                      .size
                                                                      .height *
                                                                  0.9,
                                                          minWidth: MediaQuery.of(
                                                                      context)
                                                                  .size
                                                                  .width *
                                                              0.7,
                                                          maxWidth: MediaQuery.of(
                                                                      context)
                                                                  .size
                                                                  .width *
                                                              0.7,
                                                        ),
                                                        builder: (context) =>
                                                            Expanded(
                                                                child: Profile(
                                                                    uid: gameInfo
                                                                        .creator)));
                                                  },
                                                  child: Text(
                                                    gameInfo.creatorName,
                                                    style: const TextStyle(
                                                      fontSize: 18.0,
                                                    ),
                                                  ),
                                                ),
                                                const SizedBox(width: 5),
                                                const Icon(
                                                  Icons.arrow_forward_ios,
                                                  size: 16.0,
                                                )
                                              ],
                                            ),
                                          )
                                        ]),
                                    IconButton(
                                      icon: const Icon(Icons.report),
                                      onPressed: () => {
                                        //TODO: report
                                        FirebaseService.reportUser(
                                            gameInfo.creator, context)
                                      },
                                    )
                                  ],
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(AppLocalizations.of(context)!
                                        .translate('Difficulty')),
                                    DifficultyMeter(
                                        difficulty: gameInfo.difficulty,
                                        showText: true),
                                  ],
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(AppLocalizations.of(context)!
                                        .translate('Times played')),
                                    Text(
                                      gameInfo.getPlaysText(),
                                      style: const TextStyle(
                                        fontSize: 18.0,
                                      ),
                                    ),
                                  ],
                                ),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(AppLocalizations.of(context)!
                                              .translate('Like count')),
                                          Text(
                                            gameInfo.getLikesText(),
                                            style: const TextStyle(
                                              fontSize: 18.0,
                                            ),
                                          ),
                                        ]),
                                    Row(
                                      children: [
                                        IconButton(
                                          icon: Icon(Icons.thumb_down,
                                              color: dislikeButtonColor),
                                          onPressed: () => {
                                            _dislikeGame(),
                                          },
                                        ),
                                        IconButton(
                                          icon: Icon(Icons.thumb_up,
                                              color: likeButtonColor),
                                          onPressed: () => {
                                            _likeGame(),
                                          },
                                        )
                                      ],
                                    )
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10.0),
                          Container(
                            width: 400.0,
                            height: 300.0,
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: Theme.of(context).highlightColor,
                                width: 2,
                              ),
                              borderRadius: BorderRadius.circular(10.0),
                              image: DecorationImage(
                                image: Image.network(gameInfo.imageUrl).image,
                                fit: BoxFit.cover,
                              ),
                            ),
                            // child: Image.network(
                            //   gameInfo.imageUrl,
                            //   fit: BoxFit
                            //       .cover, // Use BoxFit.cover to ensure the image covers the entire box
                            // ),
                          ),
                        ],
                      )),
                ),
                const SizedBox(width: 10.0),

                const Padding(
                    padding: EdgeInsets.only(right: 20, left: 20),
                    child: Divider()),

                // Use Expanded to make the Row take up the entire width
                Row(
                  children: [
                    const SizedBox(width: 10.0),
                    currentMatch.matchId != ''
                        ? Expanded(
                            child: Column(
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      AppLocalizations.of(context)!
                                          .translate('Waiting'),
                                      style: const TextStyle(
                                        fontSize: 18.0,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [
                                        isCreator() &&
                                                currentMatch.players.length > 1
                                            ? ElevatedButton(
                                                onPressed: () => {startGame()},
                                                child: Text(AppLocalizations.of(
                                                        context)!
                                                    .translate('Start')),
                                              )
                                            : const SizedBox(),
                                        ElevatedButton(
                                          onPressed: () => {leaveLobby()},
                                          child: const Icon(Icons.exit_to_app),
                                        ),
                                      ],
                                    )
                                  ],
                                ),
                                SizedBox(
                                  height: 350, // Adjust the height as needed
                                  child: roomsAreLoading
                                      ? const Center(
                                          child: CircularProgressIndicator())
                                      : ListView.builder(
                                          itemCount:
                                              currentMatch.players.length,
                                          itemBuilder: (context, index) {
                                            return Card(
                                                child: ListTile(
                                              leading: CircleAvatar(
                                                backgroundColor:
                                                    Theme.of(context)
                                                        .canvasColor,
                                                backgroundImage: Image.network(
                                                        currentMatch
                                                            .players[index]
                                                            .profilePic)
                                                    .image,
                                              ),

                                              title: Text(
                                                currentMatch.players.isNotEmpty
                                                    ? currentMatch
                                                        .players[index].name
                                                    : "Player",
                                              ),
                                              onTap: () {},
                                              // trailing:
                                              //     Row(children: <Widget>[
                                              //   isCreator()
                                              //       ? IconButton(
                                              //           onPressed: () => {
                                              //                 // kick player
                                              //               },
                                              //           icon: const Icon(
                                              //             Icons.close,
                                              //             size: 16.0,
                                              //           ))
                                              //       : const SizedBox(),
                                              //   IconButton(
                                              //       icon: const Icon(Icons
                                              //           .group_add_rounded),
                                              //       onPressed: () => {
                                              //             // add friend
                                              //           }),
                                              // ]))
                                            ));
                                          },
                                        ),
                                ),
                              ],
                            ),
                          )
                        : Expanded(
                            child: Column(
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      AppLocalizations.of(context)!
                                          .translate("Rooms"),
                                      style: const TextStyle(
                                        fontSize: 18.0,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    Row(
                                      children: [
                                        Text(
                                          AppLocalizations.of(context)!
                                              .translate("Create Room"),
                                          style: const TextStyle(fontSize: 16),
                                        ),
                                        IconButton(
                                          onPressed: openMatchCreationDialog,
                                          icon: const Icon(Icons.add),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                SizedBox(
                                  height: 350, // Adjust the height as needed
                                  child: roomsAreLoading
                                      ? const Center(
                                          child: CircularProgressIndicator())
                                      : ListView.builder(
                                          itemCount: filteredMatches.length,
                                          itemBuilder: (context, index) {
                                            return Card(
                                                child: ListTile(
                                                    leading: CircleAvatar(
                                                      backgroundColor:
                                                          Theme.of(context)
                                                              .canvasColor,
                                                      backgroundImage:
                                                          Image.network(
                                                                  filteredMatches[
                                                                          index]
                                                                      .players[
                                                                          0]
                                                                      .profilePic)
                                                              .image,
                                                    ),
                                                    title: Text(
                                                      filteredMatches[index]
                                                              .players
                                                              .isNotEmpty
                                                          ? filteredMatches[
                                                                  index]
                                                              .players[0]
                                                              .name
                                                          : "Player",
                                                    ),
                                                    onTap: () {
                                                      // Handle room selection
                                                      // You can navigate to the room screen or perform other actions
                                                      joinLobby(filteredMatches[
                                                          index]);
                                                    },
                                                    trailing: const Icon(
                                                      Icons.arrow_forward_ios,
                                                      size: 16.0,
                                                    )));
                                          },
                                        ),
                                ),
                              ],
                            ),
                          ),
                    const SizedBox(width: 10.0),
                  ],
                ),

                // Add a button to start the game
                const SizedBox(height: 16.0),
              ],
            ),
          ),
        ));
  }

  void openMatchCreationDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: Text(
                  AppLocalizations.of(context)!.translate("Create a match")),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: durationController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: AppLocalizations.of(context)!
                          .translate("Game Duration"),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(children: [
                    ElevatedButton(
                      onPressed: () {
                        setState(() {
                          visibility = LobbyCreationOption.allUsers;
                        });
                      },
                      style: ButtonStyle(
                        backgroundColor: MaterialStateProperty.all<Color>(
                          visibility == LobbyCreationOption.allUsers
                              ? Theme.of(context).primaryColorLight
                              : Theme.of(context).cardColor,
                        ),
                      ),
                      child: Text(
                          AppLocalizations.of(context)!.translate("Everyone"),
                          style: TextStyle(
                              color: visibility == LobbyCreationOption.allUsers
                                  ? Theme.of(context).primaryColor
                                  : Theme.of(context).brightness ==
                                          Brightness.dark
                                      ? Colors.white
                                      : Colors.black)),
                    ),
                    ElevatedButton(
                      onPressed: () {
                        setState(() {
                          visibility = LobbyCreationOption.friendsOnly;
                        });
                      },
                      style: ButtonStyle(
                        backgroundColor: MaterialStateProperty.all<Color>(
                          visibility == LobbyCreationOption.friendsOnly
                              ? Theme.of(context).primaryColorLight
                              : Theme.of(context).cardColor,
                        ),
                      ),
                      child: Text(
                          AppLocalizations.of(context)!.translate("Friends"),
                          style: TextStyle(
                              color:
                                  visibility == LobbyCreationOption.friendsOnly
                                      ? Theme.of(context).primaryColor
                                      : Theme.of(context).brightness ==
                                              Brightness.dark
                                          ? Colors.white
                                          : Colors.black)),
                    ),
                    ElevatedButton(
                      onPressed: () {
                        setState(() {
                          visibility = LobbyCreationOption.friendsOfFriends;
                        });
                      },
                      style: ButtonStyle(
                        backgroundColor: MaterialStateProperty.all<Color>(
                          visibility == LobbyCreationOption.friendsOfFriends
                              ? Theme.of(context).primaryColorLight
                              : Theme.of(context).cardColor,
                        ),
                      ),
                      child: Text(
                          AppLocalizations.of(context)!
                              .translate("Friends of Friends"),
                          style: TextStyle(
                              color: visibility ==
                                      LobbyCreationOption.friendsOfFriends
                                  ? Theme.of(context).primaryColor
                                  : Theme.of(context).brightness ==
                                          Brightness.dark
                                      ? Colors.white
                                      : Colors.black)),
                    ),
                  ]),
                  GestureDetector(
                      onTap: () => {
                            setState(() {
                              cheatAllowed = !cheatAllowed;
                            })
                          },
                      child: Row(
                        children: [
                          Checkbox(
                              value: cheatAllowed,
                              onChanged: (newValue) {
                                setState(() {
                                  cheatAllowed = newValue!;
                                });
                              }),
                          Text(
                            AppLocalizations.of(context)!
                                .translate("Cheat Mode"),
                          )
                        ],
                      ))
                ],
              ),
              actions: [
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context, false);
                  },
                  child:
                      Text(AppLocalizations.of(context)!.translate("Cancel")),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context, true);
                  },
                  child: Text(AppLocalizations.of(context)!.translate("Start")),
                ),
              ],
            );
          },
        );
      },
    ).then((value) {
      if (value == true) {
        String visibilityConverted = visibility.toString().split('.').last;
        socketService.send('c/create-lobby', {
          'mapId': gameInfo.id,
          'visibility':
              visibilityConverted == "allUsers" ? null : visibilityConverted,
          'creatorUid': _user.uid,
          'gameDuration': int.parse(durationController.text),
          'cheatAllowed': cheatAllowed
        });

        // FirebaseService.createMatchRoom(
        //     id: "${gameInfo.id}${_user.uid}",
        //     name: "${gameInfo.name} Chat",
        //     players: [_user.uid]);
      }
    });
  }
}

enum LobbyCreationOption {
  friendsOnly,
  friendsOfFriends,
  allUsers,
}

class Detail extends StatefulWidget {
  final GameInfo gameInfo;

  const Detail({super.key, required this.gameInfo});
  @override
  // ignore: no_logic_in_create_state
  State<Detail> createState() => DetailSheet(gameInfo: gameInfo);
}
