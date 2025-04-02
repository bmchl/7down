import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';
import 'package:flutterapp/classes/game_match.dart';
import 'package:flutterapp/classes/game_session.dart';
import 'package:flutterapp/components/difficulty_meter.dart';
import 'package:flutterapp/components/play-area.component.dart';
import 'package:flutterapp/services/firebase_service.dart';
import 'package:flutterapp/services/replay_service.dart';
import 'package:flutterapp/services/socket_client_service.dart';

import '../classes/environment.dart';
import '../classes/game_info.dart';
import '../classes/player.dart';

class TimeLimitGame extends StatefulWidget {
  final GameSession session;

  const TimeLimitGame({Key? key, required this.session}) : super(key: key);

  @override
  TimeLimitGameScreen createState() =>
      // ignore: no_logic_in_create_state
      TimeLimitGameScreen(session: session);
}

class TimeLimitGameScreen extends State<TimeLimitGame> {
  final GameSession session;
  // CHANGER POUR LE BON ID. EN FAISANT CA, LA BONNE COULEUR VA APPARAITRE, SOIT BLEU SOIT ROUGE.
  // final String currentUserId = socketService.id;
  // final String currentUserId = player['id'];
  SocketClientService socketService = SocketClientService();
  late SocketClientService socket;
  Timer? _timer;
  Duration _duration = Duration.zero;

  ReplayService replayService = ReplayService();

  TimeLimitGameScreen({required this.session});

  @override
  void initState() {
    super.initState();
    connectAndSetupSocket();
  }

  Future<void> connectAndSetupSocket() async {
    await socketService.connect();

    socketService.on<Map<String, dynamic>>("update-match", (data) {
      print("UM - Received data from server: $data");
      Map<String, dynamic> match = data['match'];
      print("UM - Match: $match");

      String matchId = data['match']['matchId'] ?? '';
      List<dynamic> playersData = data['match']['players'];
      int startTime = data['match']['startTime'];

      List<Player> players = [];
      if (playersData.isNotEmpty) {
        for (dynamic player in playersData) {
          players.add(Player(
            id: player['id'],
            uid: player['uid'],
            name: player['name'],
            profilePic: player['profilePic'],
            creator: player['creator'] ?? false,
            found: player['found'] ?? 0,
            forfeitter: player['forfeitter'] ?? false,
          ));
        }
      }

      int currentIndex = data['match']['gamesIndex'] ?? 0;

      print("BB - Current index: $currentIndex");

      session.info = GameInfo(
        id: data["match"]["games"][currentIndex]["id"] ?? '',
        name: data["match"]["games"][currentIndex]["gameName"] ?? '',
        difficulty: data["match"]["games"][currentIndex]['difficulty'] == 0
            ? "FACILE"
            : "DIFFICILE",
        imageUrl: Environment.serverUrl +
            (data["match"]["games"][currentIndex]["image"] ?? ''),
        image1Url: Environment.serverUrl +
            (data["match"]["games"][currentIndex]["image1"] ?? ''),
        creator: data["match"]["games"][currentIndex]["creator"] ?? '',
        likes: data["match"]["games"][currentIndex]['likes'] == null
            ? '0'
            : data["match"]["games"][currentIndex]['likes'].toString(),
        plays: data["match"]["games"][currentIndex]['plays'] == null
            ? '0'
            : data["match"]["games"][currentIndex]['plays'].toString(),
        differences: data["match"]["games"][currentIndex]["imageDifference"]
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
            }).toList() ??
            [],
      );

      print("UM - Match: $matchId, $players, $startTime");

      session.match = GameMatch(
        matchId: matchId,
        mapId: session.match.mapId,
        players: players,
        startTime: startTime,
        differenceIndex: data['match']['differenceIndex'].map<int>((item) {
          if (item is! int) {
            throw Exception('Non-integer item encountered');
          }
          return item;
        }).toList(),
        gamesIndex: data['match']['gamesIndex'] ?? 0,
        gameDuration: match['gameDuration'],
        bonusTimeOnHit: match['bonusTimeOnHit'],
        cheatAllowed: match['cheatAllowed'],
      );

      setState(() {});
      print("UM - END");
    });

    socketService.on<Map<String, dynamic>>("game-ended", (data) {
      print("Received data from server: $data");
      Map<String, dynamic> match = data['match'];
      print("Match: $match");

      String matchId = data['match']['matchId'] ?? '';
      List<dynamic> playersData = data['match']['players'];
      int startTime = data['match']['startTime'];

      FirebaseService.leaveMatchRoom(
          matchId, FirebaseAuth.instance.currentUser!.uid);

      List<Player> players = [];
      if (playersData.isNotEmpty) {
        for (dynamic player in playersData) {
          players.add(Player(
            id: player['id'],
            uid: player['uid'],
            name: player['name'],
            profilePic: player['profilePic'],
            creator: player['creator'] ?? false,
            found: player['found'] ?? 0,
            forfeitter: player['forfeitter'] ?? false,
          ));
        }
      }

      gameEnded(
          match: GameMatch(
        matchId: matchId,
        mapId: session.match.mapId,
        players: players,
        startTime: startTime,
        winnerSocketId: match['winnerSocketId'],
        gameDuration: match['gameDuration'],
        bonusTimeOnHit: match['bonusTimeOnHit'],
        cheatAllowed: match['cheatAllowed'],
      ));
    });
    _startChronometer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  double imageContainerWidth = 640;
  double imageContainerHeight = 480;
  double borderRadiusValue = 25;

  void _startChronometer() {
    _timer = Timer.periodic(const Duration(milliseconds: 10), (Timer timer) {
      if (session.match.winnerSocketId == '') {
        setState(() {
          final now = DateTime.now().millisecondsSinceEpoch;
          final elapsedTime =
              ((now - (session.match.startTime)) / 1000).floor();
          final gameDuration = session.match.gameDuration;
          final bonusTimeOnHit = session.match.bonusTimeOnHit ?? 0;
          final foundDifferences = session.match.players
              .fold<int>(0, (total, player) => total + player.found);

          var remainingTime =
              gameDuration - elapsedTime + foundDifferences * bonusTimeOnHit;
          remainingTime =
              remainingTime < gameDuration ? remainingTime : gameDuration;
          remainingTime = remainingTime > 0 ? remainingTime : 0;

          if (remainingTime <= 0) {
            timer.cancel();
          }

          _duration = Duration(seconds: remainingTime);
        });
      }
    });
  }

  void abandonGame() {
    print('LEAVEGAME');
    socketService.send('c/abandon-game');
  }

  void gameEnded({required GameMatch match}) {
    print(match);
    session.match = match;

    print('socket id ${socketService.socket?.id}');

    String dialogTitle = socketService.socket?.id ==
            session.match.winnerSocketId
        ? AppLocalizations.of(context)!.translate("Felicitation")
        : '${session.match.winnerSocketId} ${AppLocalizations.of(context)!.translate("wins")}';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: Text(dialogTitle),
          actions: <Widget>[
            TextButton(
              onPressed: () {
                Navigator.of(dialogContext).pop();
                Navigator.of(context).pop();
              },
              child: Text(
                  AppLocalizations.of(context)!.translate("Back to main page")),
            ),
          ],
        );
      },
    );
  }

  void _showConfirmAbandonDialog() {
    if (session.match.winnerSocketId != "") {
      Navigator.of(context).pop();
      return;
    }
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: Text(AppLocalizations.of(context)!.translate("Abandon popup")),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: Text(AppLocalizations.of(context)!.translate("Back")),
            ),
            TextButton(
              onPressed: () {
                // If OK is pressed, perform the abandon game logic,
                // close both dialogs and navigate to the games page.
                abandonGame();
                Navigator.of(dialogContext).pop(); // Close the abandon dialog
                Navigator.of(context)
                    .pop(); // Pop the current screen off the navigation stack
                // Navigate to the games page, modify this as per your navigation logic
                // Navigator.pushReplacementNamed(context, '/gamesPage');
              },
              child: Text(AppLocalizations.of(context)!.translate("Abandon")),
            ),
          ],
        );
      },
    );
  }

  String _printDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    String twoDigitMinutes = twoDigits(duration.inMinutes.remainder(60));
    String twoDigitSeconds = twoDigits(duration.inSeconds.remainder(60));
    return "${twoDigits(duration.inHours)}:$twoDigitMinutes:$twoDigitSeconds";
  }

  String capitalize(String s) => s[0].toUpperCase() + s.substring(1);

  @override
  Widget build(BuildContext context) {
    print("differences from game sreen ${session.info.differences[0]}");
    return Scaffold(
      backgroundColor: Colors.white.withOpacity(0.7),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Material(
                borderRadius: BorderRadius.circular(borderRadiusValue),
                elevation: 5,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16.0, vertical: 8.0),
                  decoration: BoxDecoration(
                    color: const Color.fromRGBO(224, 221, 240, 0.3)
                        .withOpacity(0.8),
                    borderRadius: BorderRadius.circular(borderRadiusValue),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Map:${session.info.name}",
                        style: const TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 22,
                        ),
                      ),
                      const SizedBox(height: 8),
                      RichText(
                        text: TextSpan(
                          style: const TextStyle(
                            fontSize: 16.0,
                            color: Colors.black,
                          ),
                          children: <TextSpan>[
                            TextSpan(
                                text:
                                    "${AppLocalizations.of(context)!.translate("Game Mode")}: "),
                            TextSpan(
                              text: capitalize(session.mode),
                              style:
                                  const TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Text(
                                AppLocalizations.of(context)!
                                    .translate("Difficulty level:"),
                                style: const TextStyle(
                                  color: Colors.black,
                                  fontSize: 16,
                                ),
                              ),
                              DifficultyMeter(
                                difficulty: session.info.difficulty,
                                showText: true,
                              ),
                            ],
                          ),
                          const Spacer(),
                          Text(
                            "${AppLocalizations.of(context)!.translate("Differences count")}: ${session.info.differences.length}",
                            style: const TextStyle(
                              color: Colors.black,
                              fontSize: 16,
                            ),
                          ),
                          const Spacer(),
                          ElevatedButton(
                            onPressed: _showConfirmAbandonDialog,
                            style: ElevatedButton.styleFrom(
                              backgroundColor:
                                  const Color.fromRGBO(224, 196, 197, 1),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(18.0),
                              ),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 20, vertical: 10),
                            ),
                            child: Text(
                              session.match.players
                                          .firstWhere((element) =>
                                              element.id ==
                                              session.match.winnerSocketId)
                                          .name !=
                                      ""
                                  ? AppLocalizations.of(context)!
                                      .translate("Back to main page")
                                  : AppLocalizations.of(context)!
                                      .translate("Abandon"),
                              style: const TextStyle(color: Colors.black),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 5),
            // Body
            PlayAreaComponent(
              images: [session.info.imageUrl, session.info.image1Url],
              differences: session.info.differences,
              gameSession: session,
              replayService: replayService,
            ),
            const SizedBox(height: 5),
            // Footer
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Material(
                borderRadius: BorderRadius.circular(borderRadiusValue),
                elevation: 20,
                child: Container(
                  height: 100,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16.0, vertical: 8.0),
                  decoration: BoxDecoration(
                    color: const Color.fromRGBO(224, 221, 240, 0.3)
                        .withOpacity(0.8),
                    borderRadius: BorderRadius.circular(borderRadiusValue),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Here's the RichText for the chronometer
                      RichText(
                        text: TextSpan(
                          style: const TextStyle(
                            fontSize: 20, // Adjust the font size as needed
                            fontWeight: FontWeight.bold,
                          ),
                          children: <TextSpan>[
                            TextSpan(
                              text:
                                  '${AppLocalizations.of(context)!.translate("Chronometer")}: ',
                              style: const TextStyle(color: Colors.black),
                            ),
                            TextSpan(
                              text: _printDuration(_duration),
                              style: const TextStyle(color: Colors.blue),
                            ),
                          ],
                        ),
                      ),
                      // Player details remain the same
                      for (var player in session.match.players)
                        Column(
                          children: [
                            Text(
                              AppLocalizations.of(context)!
                                  .translate("Differences found by"),
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            Text(
                              player
                                  .name, // Assuming player name is what you want to display
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: player.id == socketService.socket?.id
                                    ? Colors.blue
                                    : Colors.red,
                              ),
                            ),
                            Text(
                              player.forfeitter
                                  ? AppLocalizations.of(context)!
                                      .translate("Abandon")
                                  : "${player.found.toString()} ",
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
