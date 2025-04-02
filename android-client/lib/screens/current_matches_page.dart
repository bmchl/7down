import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';
import 'package:flutterapp/classes/environment.dart';
import 'package:flutterapp/classes/game_info.dart';
import 'package:flutterapp/classes/game_match.dart';
import 'package:flutterapp/classes/game_session.dart';
import 'package:flutterapp/screens/game.dart';
import 'package:flutterapp/screens/time_limit_game.dart';
import 'package:flutterapp/services/firebase_service.dart';
import 'package:flutterapp/services/game_info_service.dart';
import 'package:flutterapp/services/replay_service.dart';
import 'package:flutterapp/services/socket_client_service.dart';

import '../classes/player.dart';

enum SortingOptions { byPlays, byLikes }

class CurrentMatchesPage extends State<CurrentMatches> {
  SocketClientService socketService = SocketClientService();
  List<GameSession> matches = [];
  List<GameSession> filteredMatches = [];
  bool roomsAreLoading = true; // Added loading indicator state
  late User _user;

  void spectateMatch(GameSession session) {
    if (session.mode == 'classic') {
      socketService.send('s/spectate-match', {'matchId': session.id});

      ReplayService replayService = ReplayService();

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => Game(
            session: session,
            replayService: replayService,
          ),
        ),
      ).then((value) {
        matches = [];
        socketService.send('s/get-lobbies');
      });
    } else if (session.mode == 'time-limit') {
      socketService.send('s/spectate-match', {'matchId': session.id});

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => TimeLimitGame(
            session: session,
          ),
        ),
      ).then((value) {
        matches = [];
        socketService.send('s/get-lobbies');
      });
    }
  }

  void setMatches(List<GameSession> newMatches) {
    setState(() {
      matches = newMatches;
      roomsAreLoading = false;
    });
    findOpenMatches(matches);
  }

  Future<void> findOpenMatches(List<GameSession> sessions) async {
    final tempSessions = <GameSession>[];

    setState(() {
      filteredMatches = [];
    });

    for (final session in sessions) {
      if ((session.match.visibility == null) && session.match.startTime != 0) {
        tempSessions.add(session);
      } else {
        final creatorId = session.match.players
            .firstWhere(
              (player) => player.creator,
            )
            .uid;

        List<Map<dynamic, dynamic>> friends =
            await FirebaseService.getFriends(creatorId);
        final friendsOfFriends = <String>[];

        if (session.match.visibility == 'friendsOfFriends') {
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
          tempSessions.add(session);
        }
      }

      final blockedUids = await FirebaseService.getBlockedUsers(_user.uid);
      tempSessions.removeWhere((session) =>
          session.match.players
              .any((player) => blockedUids.contains(player.uid)) ||
          session.match.startTime == 0 ||
          DateTime.now().millisecondsSinceEpoch - (session.match.startTime) >
              600000);
    }
    setState(() {
      filteredMatches = tempSessions;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)!.translate("Spectate")),
      ),
      body: Padding(
        padding: const EdgeInsets.only(left: 30, right: 30),
        child: Expanded(
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    AppLocalizations.of(context)!.translate("Rooms"),
                    style: const TextStyle(
                      fontSize: 18.0,
                      fontWeight: FontWeight.bold,
                    ),
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
                                                .match
                                                .players[0]
                                                .profilePic)
                                        .image,
                                  ),
                                  title: Row(
                                    children: [
                                      const SizedBox(width: 4.0),
                                      Text(
                                        filteredMatches[index]
                                                .match
                                                .players
                                                .isNotEmpty
                                            ? filteredMatches[index]
                                                .match
                                                .players[0]
                                                .name
                                            : "Player",
                                      ),
                                      const SizedBox(width: 4.0),
                                      const Icon(
                                        Icons.visibility,
                                        size: 16.0,
                                      ),
                                      Text(
                                        filteredMatches[index]
                                            .match
                                            .spectators
                                            .length
                                            .toString(),
                                        style: const TextStyle(
                                          fontSize: 12.0,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ],
                                  ),
                                  onTap: () {
                                    // Handle room selection
                                    // You can navigate to the room screen or perform other actions
                                    spectateMatch(filteredMatches[index]);
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
      's/update-awaiting-matches',
      (data) async {
        print('YYYY - Matches: $data');
        if (data.isNotEmpty) {
          List<dynamic> matchesData = data['matches'];
          List<GameSession> newMatches = [];
          for (dynamic match in matchesData) {
            if (match != null && match['startTime'] != 0) {
              String gamemode = match['gamemode'] ?? '';
              List<dynamic> playersData = match['players'] ?? [];
              List<Player> players = [];
              List<String> spectators = [];
              List<int> foundDifferencesIndex = [];
              List<int> differenceIndex = [];
              int gamesIndex = 0;
              String visibility = match['visibility'];

              GameInfo gameInfo = GameInfo(
                id: '',
                name: '',
                difficulty: '',
                imageUrl: '',
                image1Url: '',
                creator: '',
                likes: '',
                plays: '',
                differences: [],
              );

              // Check if 'players' is not null and is a list before mapping
              for (dynamic player in playersData) {
                players.add(Player(
                  uid: player['uid'],
                  id: player['id'],
                  name: player['name'],
                  profilePic: player['profilePic'],
                  creator: player['creator'] ?? false,
                ));
              }

              for (dynamic spectator in match['spectators']) {
                spectators.add(spectator['id']);
              }

              print("YYYY - ${spectators.length}");

              if (gamemode == 'classic') {
                print('Classic mode + $match');

                for (dynamic foundDifferenceIndex
                    in match['foundDifferencesIndex']) {
                  foundDifferencesIndex.add(foundDifferenceIndex);
                }

                try {
                  // Fetch the games again
                  // You can call the getGames method from the SelectionPage state
                  GameInfoService gameInfoService = GameInfoService();
                  try {
                    gameInfo = await gameInfoService.fetchGame(match['mapId']);
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
              } else if (gamemode == 'time-limit') {
                print('Time limit mode + $match');
                differenceIndex = match['differenceIndex'].map<int>((item) {
                  if (item is! int) {
                    throw Exception('Non-integer item encountered');
                  }
                  return item;
                }).toList();
                gamesIndex = match['gamesIndex'] ?? 0;

                int currentIndex = match['gamesIndex'] ?? 0;

                List<String> gameImages = [
                  Environment.serverUrl +
                      (match["games"][currentIndex]["image"] ?? ''),
                  Environment.serverUrl +
                      (match["games"][currentIndex]["image1"] ?? '')
                ];

                List<List<List<int>>> differences = List<List<List<int>>>.from(
                    match["games"][currentIndex]['imageDifference']
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
                }));

                gameInfo = GameInfo(
                  id: match["games"][currentIndex]["id"] ?? '',
                  name: match["games"][currentIndex]["gameName"] ?? '',
                  difficulty: match["games"][currentIndex]['difficulty'] == 0
                      ? "FACILE"
                      : "DIFFICILE",
                  imageUrl: gameImages[0],
                  image1Url: gameImages[1],
                  creator: match["creator"] ?? '',
                  likes: match["games"][currentIndex]['likes'] == null
                      ? '0'
                      : match["games"][currentIndex]['likes'].toString(),
                  plays: match["games"][currentIndex]['plays'] == null
                      ? '0'
                      : match["games"][currentIndex]['plays'].toString(),
                  differences: differences,
                );
              }

              GameMatch gameMatch = GameMatch(
                  matchId: match['matchId'],
                  mapId: match['mapId'] ?? '',
                  players: players,
                  startTime: match['startTime'],
                  spectators: spectators,
                  gamemode: gamemode,
                  foundDifferencesIndex: foundDifferencesIndex,
                  differenceIndex: differenceIndex,
                  gamesIndex: gamesIndex,
                  gameDuration: match['gameDuration'],
                  bonusTimeOnHit: match['bonusTimeOnHit'] ?? 0,
                  cheatAllowed: match['cheatAllowed'],
                  visibility: visibility);

              GameSession session = GameSession(
                  id: match['matchId'],
                  mode: gamemode,
                  match: gameMatch,
                  info: gameInfo,
                  specator: true);

              newMatches.add(session);
            }
          }
          print(newMatches);
          setMatches(newMatches);
        } else {
          socketService.send('s/get-lobbies');
          // display snackbar with error message
          SnackBar snackBar = const SnackBar(
            content: Text('Error fetching matches. Fetching again...'),
          );
          ScaffoldMessenger.of(context).showSnackBar(snackBar);
        }
      },
    );

    socketService.send('s/get-lobbies');
  }
}

class CurrentMatches extends StatefulWidget {
  const CurrentMatches({super.key});
  @override
  State<CurrentMatches> createState() => CurrentMatchesPage();
}
