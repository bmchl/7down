import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';
import 'package:flutterapp/classes/game_match.dart';
import 'package:flutterapp/screens/detail.dart';
import 'package:flutterapp/screens/time_limit_game.dart';
import 'package:flutterapp/services/firebase_service.dart';
import 'package:flutterapp/services/socket_client_service.dart';

import '../classes/environment.dart';
import '../classes/game_info.dart';
import '../classes/game_session.dart';
import '../classes/player.dart';

enum SortingOptions { byPlays, byLikes }

class TimeLimitLobbyPage extends State<TimeLimitLobby> {
  late User _user;
  Map<dynamic, dynamic>? userData = <dynamic, dynamic>{};
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
  LobbyCreationOption visibility = LobbyCreationOption.allUsers;
  TextEditingController durationController = TextEditingController(text: '120');
  TextEditingController bonusTimeOnHitController =
      TextEditingController(text: '5');
  bool cheatAllowed = false;

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

  void leaveLobby() async {
    await FirebaseService.leaveMatchRoom(currentMatch.matchId, _user.uid);
    socketService.send('tl/leave-lobby', {'matchId': currentMatch.matchId});
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
    socketService.send('tl/start-game', {'matchId': currentMatch.matchId});
  }

  void joinLobby(GameMatch match) {
    socketService.send('tl/join-lobby', {'matchId': match.matchId});
  }

  void setMatches(List<GameMatch> newMatches) {
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title:
            Text(AppLocalizations.of(context)!.translate('Time Limit Lobby')),
      ),
      body: Padding(
        padding: const EdgeInsets.only(left: 30, right: 30),
        child: currentMatch.matchId != ''
            ? Expanded(
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          AppLocalizations.of(context)!.translate("Waiting"),
                          style: const TextStyle(
                            fontSize: 18.0,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            isCreator() && currentMatch.players.length > 1
                                ? ElevatedButton(
                                    onPressed: () => {startGame()},
                                    child: Text(AppLocalizations.of(context)!
                                        .translate("Start")),
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
                          ? const Center(child: CircularProgressIndicator())
                          : ListView.builder(
                              itemCount: currentMatch.players.length,
                              itemBuilder: (context, index) {
                                return Card(
                                    child: ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor:
                                        Theme.of(context).canvasColor,
                                    backgroundImage: Image.network(currentMatch
                                            .players[index].profilePic)
                                        .image,
                                  ),

                                  title: Text(
                                    currentMatch.players.isNotEmpty
                                        ? currentMatch.players[index].name
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
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          AppLocalizations.of(context)!.translate('Rooms'),
                          style: const TextStyle(
                            fontSize: 18.0,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        IconButton(
                          onPressed: openMatchCreationDialog,
                          icon: const Icon(Icons.add),
                        ),
                      ],
                    ),
                    SizedBox(
                      height: 350, // Adjust the height as needed
                      child: roomsAreLoading
                          ? const Center(child: CircularProgressIndicator())
                          : ListView.builder(
                              itemCount: filteredMatches.length,
                              itemBuilder: (context, index) {
                                return Card(
                                    child: ListTile(
                                        leading: CircleAvatar(
                                          backgroundColor:
                                              Theme.of(context).canvasColor,
                                          backgroundImage: Image.network(
                                                  filteredMatches[index]
                                                      .players[0]
                                                      .profilePic)
                                              .image,
                                        ),
                                        title: Text(
                                          filteredMatches[index]
                                                  .players
                                                  .isNotEmpty
                                              ? filteredMatches[index]
                                                  .players[0]
                                                  .name
                                              : "Player",
                                        ),
                                        onTap: () {
                                          // Handle room selection
                                          // You can navigate to the room screen or perform other actions
                                          joinLobby(filteredMatches[index]);
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
      ),
    );
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
                            .translate("Game Duration")),
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: bonusTimeOnHitController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: AppLocalizations.of(context)!
                          .translate("Bonus Time on Hit"),
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
                              ? Theme.of(context).primaryColor
                              : Theme.of(context).cardColor,
                        ),
                      ),
                      child: Text(
                          AppLocalizations.of(context)!.translate("Everyone"),
                          style: TextStyle(
                              color: visibility == LobbyCreationOption.allUsers
                                  ? Theme.of(context).cardColor
                                  : Theme.of(context).primaryColor)),
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
                              ? Theme.of(context).primaryColor
                              : Theme.of(context).cardColor,
                        ),
                      ),
                      child: Text(
                          AppLocalizations.of(context)!.translate("Friends"),
                          style: TextStyle(
                              color:
                                  visibility == LobbyCreationOption.friendsOnly
                                      ? Theme.of(context).cardColor
                                      : Theme.of(context).primaryColor)),
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
                              ? Theme.of(context).primaryColor
                              : Theme.of(context).cardColor,
                        ),
                      ),
                      child: Text(
                          AppLocalizations.of(context)!
                              .translate("Friends of Friends"),
                          style: TextStyle(
                              color: visibility ==
                                      LobbyCreationOption.friendsOfFriends
                                  ? Theme.of(context).cardColor
                                  : Theme.of(context).primaryColor)),
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
        socketService.send('tl/create-lobby', {
          'visibility':
              visibilityConverted == "allUsers" ? null : visibilityConverted,
          'creatorUid': _user.uid,
          'gameDuration': int.parse(durationController.text),
          'bonusTimeOnHit': int.parse(bonusTimeOnHitController.text),
          'cheatAllowed': cheatAllowed,
        });
      }
    });
  }

  @override
  void dispose() {
    socketService.removeAllListeners();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();

    _user = FirebaseAuth.instance.currentUser!;
    connectAndSetupSocket();
  }

  Future<void> connectAndSetupSocket() async {
    await socketService.connect();

    socketService.on<Map<String, dynamic>>(
      'tl/update-awaiting-matches',
      (data) {
        print(data);
        if (data.isNotEmpty) {
          List<dynamic> matchesData = data['matches'];
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
                mapId: 'mapId',
                players: players,
                visibility: match['visibility'],
                startTime: match['startTime'],
                gameDuration: match['gameDuration'],
                bonusTimeOnHit: match['bonusTimeOnHit'],
                cheatAllowed: match['cheatAllowed'],
              );

              newMatches.add(gameMatch);
            }
          }
          print(newMatches);
          setMatches(newMatches);
        } else {
          socketService.send('tl/get-lobbies');
          // display snackbar with error message
          SnackBar snackBar = const SnackBar(
            content: Text('Error fetching matches. Fetching again...'),
          );
          ScaffoldMessenger.of(context).showSnackBar(snackBar);
        }
      },
    );

    socketService.on<Map<String, dynamic>>(
      'tl/update-match-info',
      (data) {
        if (data.isNotEmpty) {
          String mapId = data['match']['mapId'] ?? '';
          String matchId = data['match']['matchId'] ?? '';
          List<dynamic> playersData = data['match']['players'];

          print("AA - playersData: $playersData");

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
            bonusTimeOnHit: data['match']['bonusTimeOnHit'],
            cheatAllowed: data['match']['cheatAllowed'],
          );

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

    socketService.send('tl/get-lobbies');

    socketService.on<Map<String, dynamic>>('tl/game-started', (data) async {
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

        setState(() {
          currentMatch = GameMatch(
            matchId: matchId,
            players: players,
            startTime: startTime,
            differenceIndex: data['match']['differenceIndex'].map<int>((item) {
              if (item is! int) {
                throw Exception('Non-integer item encountered');
              }
              return item;
            }).toList(),
            gamesIndex: data['match']['gamesIndex'] ?? 0,
            gameDuration: data['match']['gameDuration'],
            bonusTimeOnHit: data['match']['bonusTimeOnHit'],
            cheatAllowed: data['match']['cheatAllowed'],
          );
        });

        int currentIndex = data['match']['gamesIndex'] ?? 0;

        List<String> gameImages = [
          Environment.serverUrl +
              (data["match"]["games"][currentIndex]["image"] ?? ''),
          Environment.serverUrl +
              (data["match"]["games"][currentIndex]["image1"] ?? '')
        ];
        List<List<List<int>>> differences = data["match"]["games"][currentIndex]
                ['imageDifference']
            .map<List<List<int>>>((item) {
          if (item is! List) {
            throw Exception('Non-list item encountered');
          }
          return item.map<List<int>>((subItem) {
            if (subItem is! List) {
              throw Exception('Non-list subItem encountered');
            }
            return subItem.map<int>((innerItem) {
              if (innerItem is! int) {
                throw Exception('Non-integer innerItem encountered');
              }
              return innerItem;
            }).toList();
          }).toList();
        }).toList();

        GameSession session = GameSession(
          info: GameInfo(
            id: data["match"]["games"][currentIndex]["id"] ?? '',
            name: data["match"]["games"][currentIndex]["gameName"] ?? '',
            difficulty: data["match"]["games"][currentIndex]['difficulty'] == 0
                ? "FACILE"
                : "DIFFICILE",
            imageUrl: gameImages[0],
            image1Url: gameImages[1],
            creator: data["match"]["creator"] ?? '',
            likes: data["match"]["games"][currentIndex]['likes'] == null
                ? '0'
                : data["match"]["games"][currentIndex]['likes'].toString(),
            plays: data["match"]["games"][currentIndex]['plays'] == null
                ? '0'
                : data["match"]["games"][currentIndex]['plays'].toString(),
            differences: differences,
          ),
          match: currentMatch,
          mode: gameMode,
          id: id,
        );

        // FirebaseService.createMatchRoom(
        //     id: currentMatch.matchId,
        //     name: "Time Limit Game",
        //     players: currentMatch.players.map((player) => player.id).toList());

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => TimeLimitGame(
              session: session,
            ),
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
        });
      }
    });
  }
}

class TimeLimitLobby extends StatefulWidget {
  const TimeLimitLobby({super.key});
  @override
  State<TimeLimitLobby> createState() => TimeLimitLobbyPage();
}
