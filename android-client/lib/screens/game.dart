import 'dart:async';
import 'dart:math';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';
import 'package:flutterapp/classes/game_match.dart';
import 'package:flutterapp/classes/game_session.dart';
import 'package:flutterapp/components/chat_drawer.dart';
import 'package:flutterapp/components/difficulty_meter.dart';
import 'package:flutterapp/components/play-area.component.dart';
import 'package:flutterapp/screens/auth_wrapper.dart';
import 'package:flutterapp/services/firebase_service.dart';
import 'package:flutterapp/services/replay_service.dart';
import 'package:flutterapp/services/socket_client_service.dart';

import '../classes/player.dart';

class Game extends StatefulWidget {
  final GameSession session;
  final ReplayService replayService;

  const Game({Key? key, required this.session, required this.replayService})
      : super(key: key);

  @override
  GameScreen createState() =>
      // ignore: no_logic_in_create_state
      GameScreen(session: session, replayService: replayService);
}

class GameScreen extends State<Game> {
  final GameSession session;

  double imageContainerWidth = 640;
  double imageContainerHeight = 480;
  double borderRadiusValue = 25;

  SocketClientService socketService = SocketClientService();
  late SocketClientService socket;
  Timer? _timer;
  Duration _duration = Duration.zero;

  final ReplayService replayService;
  late StreamSubscription timePositionChanged;

  GameScreen({required this.session, required this.replayService});

  @override
  void initState() {
    super.initState();

    replayService.uid = FirebaseAuth.instance.currentUser!.uid;
    replayService.mapId = session.info.id;

    timePositionChanged = replayService.timePositionChanged.listen((event) {
      setState(() {});
    });
    print("xx ${session.info.differences}");

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
      List<String> spectators = [];
      for (dynamic spectator in match['spectators']) {
        spectators.add(spectator['id']);
      }

      List<int> foundDifferencesIndex = [];
      for (dynamic foundDifferenceIndex in match['foundDifferencesIndex']) {
        foundDifferencesIndex.add(foundDifferenceIndex);
      }

      print("UM - Match: $matchId, $players, $startTime");

      session.match = GameMatch(
        matchId: matchId,
        mapId: session.match.mapId,
        players: players,
        startTime: startTime,
        foundDifferencesIndex: foundDifferencesIndex,
        spectators: spectators,
        gamemode: session.match.gamemode,
        gameDuration: match['gameDuration'],
        cheatAllowed: match['cheatAllowed'],
      );

      print("UM - END");
    });

    socketService.on<Map<String, dynamic>>("game-ended", (data) {
      print("Received data from server: $data");
      Map<String, dynamic> match = data['match'];
      print("Match: $match");

      String matchId = data['match']['matchId'] ?? '';
      List<dynamic> playersData = data['match']['players'];
      int startTime = data['match']['startTime'];
      int endTime = data['match']['endTime'];

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
      List<String> spectators = [];
      for (dynamic spectator in match['spectators']) {
        spectators.add(spectator['id']);
      }

      List<int> foundDifferencesIndex = [];
      for (dynamic foundDifferenceIndex in match['foundDifferencesIndex']) {
        foundDifferencesIndex.add(foundDifferenceIndex);
      }

      replayService.setGameTime((endTime - startTime).toDouble());

      gameEnded(
          match: GameMatch(
        matchId: matchId,
        mapId: session.match.mapId,
        players: players,
        startTime: startTime,
        winnerSocketId: match['winnerSocketId'],
        foundDifferencesIndex: foundDifferencesIndex,
        spectators: spectators,
        gamemode: session.match.gamemode,
        gameDuration: match['gameDuration'],
        cheatAllowed: match['cheatAllowed'],
      ));
    });
    socketService.send("all/update-match");

    _startChronometer();
    replayService.saveStartTime();
  }

  @override
  void dispose() {
    _timer?.cancel();
    replayService.pause();
    super.dispose();
  }

  void startReplay() {
    replayService.setBuildContext(context);
    replayService.reset();
    replayService.replayOrResume();
    setState(() {});
  }

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
    FirebaseService.leaveMatchRoom(
        session.match.matchId, FirebaseAuth.instance.currentUser!.uid);
  }

  void gameEnded({required GameMatch match}) {
    print(match);
    session.match = match;

    print('socket id ${socketService.socket?.id}');

    _timer?.cancel();
    FirebaseService.leaveMatchRoom(
        session.match.matchId, FirebaseAuth.instance.currentUser!.uid);
    String dialogTitle = socketService.socket?.id ==
            session.match.players
                .firstWhere(
                    (element) => element.id == session.match.winnerSocketId)
                .name
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
            TextButton(
              onPressed: () {
                Navigator.of(dialogContext).pop();
                startReplay();
              },
              child:
                  Text(AppLocalizations.of(context)!.translate("Start replay")),
            )
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
    if (session.specator) {
      socketService.send("s/stop-spectating");
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
                abandonGame();

                Navigator.of(dialogContext).pop();
                Navigator.of(context).pop();
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
  final GlobalKey<ScaffoldState> scaffoldKey = GlobalKey<ScaffoldState>();

  void openDrawer() {
    scaffoldKey.currentState!.openEndDrawer();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        // backgroundColor: Theme.of(context).primaryColorLight.withOpacity(0.5),
        key: scaffoldKey,
        floatingActionButton: FloatingActionButton(
          onPressed: openDrawer,
          child: const Icon(Icons.chat),
        ),
        endDrawer: const AuthenticationWrapper(child: ChatDrawer()),
        body: SafeArea(
          child: SingleChildScrollView(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Material(
                    borderRadius: BorderRadius.circular(borderRadiusValue),
                    elevation: 2,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16.0, vertical: 8.0),
                      decoration: BoxDecoration(
                        color: Theme.of(context)
                            .primaryColorLight
                            .withOpacity(0.2),
                        borderRadius: BorderRadius.circular(borderRadiusValue),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Map name: ${session.info.name}",
                            style: const TextStyle(
                              // color: Colors.black,
                              fontWeight: FontWeight.bold,
                              fontSize: 22,
                            ),
                          ),
                          RichText(
                            text: TextSpan(
                              style: const TextStyle(
                                fontSize: 16.0,
                              ),
                              children: <TextSpan>[
                                TextSpan(
                                    text:
                                        "${AppLocalizations.of(context)!.translate("Game Mode")}: "),
                                TextSpan(
                                  text: capitalize(session.mode),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
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
                              Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      "${AppLocalizations.of(context)!.translate("Differences count")}: ${session.info.differences.length}",
                                      style: const TextStyle(
                                        fontSize: 16,
                                      ),
                                    ),
                                    Row(children: [
                                      const Icon(Icons.visibility),
                                      const SizedBox(width: 10),
                                      Text(
                                        "${session.match.spectators.length}",
                                        style: const TextStyle(
                                          fontSize: 16,
                                        ),
                                      ),
                                    ])
                                  ]),
                              const Spacer(),
                              ElevatedButton(
                                onPressed: _showConfirmAbandonDialog,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor:
                                      Theme.of(context).brightness ==
                                              Brightness.dark
                                          ? Colors.red[800]
                                          : Colors.red[200],
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(18.0),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 20, vertical: 10),
                                ),
                                child: Text(
                                  session.specator
                                      ? AppLocalizations.of(context)!
                                          .translate("Quit")
                                      : (session.match.winnerSocketId != ""
                                          ? AppLocalizations.of(context)!
                                              .translate("Back to main page")
                                          : AppLocalizations.of(context)!
                                              .translate("Abandon")),
                                  style: TextStyle(
                                    color: Theme.of(context).brightness ==
                                            Brightness.dark
                                        ? Colors.white
                                        : Colors.black,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (replayService.isInReplayMode)
                  Container(
                    alignment: Alignment.center,
                    padding: const EdgeInsets.symmetric(vertical: 8.0),
                    child: Text(
                      AppLocalizations.of(context)!.translate("In Replay mode"),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18.0,
                      ),
                    ),
                  ),
                Container(
                    padding: const EdgeInsets.all(2.0),
                    decoration: BoxDecoration(
                      color:
                          Theme.of(context).primaryColorLight.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(borderRadiusValue),
                    ),
                    child: PlayAreaComponent(
                        images: [session.info.imageUrl, session.info.image1Url],
                        differences: session.info.differences,
                        gameSession: session,
                        replayService: replayService)),
                replayService.isInReplayMode
                    ? buildReplayFooter()
                    : buildNormalFooter(),
              ],
            ),
          ),
        ));
  }

  Widget buildNormalFooter() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Material(
        borderRadius: BorderRadius.circular(borderRadiusValue),
        elevation: 2,
        child: Container(
          height: 100,
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
          decoration: BoxDecoration(
            color: Theme.of(context).primaryColorLight.withOpacity(0.2),
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
                          ? AppLocalizations.of(context)!.translate("Abandon")
                          : "${player.found.toString()} / ${(session.info.differences.length / 2).ceil()}",
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget buildReplayFooter() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Material(
        borderRadius: BorderRadius.circular(25.0),
        elevation: 2,
        child: Container(
          height: 100,
          decoration: BoxDecoration(
            color: Theme.of(context).primaryColorLight.withOpacity(0.2),
            borderRadius: BorderRadius.circular(25.0),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () {
                  replayService.reset();
                  setState(() {});
                },
              ),
              IconButton(
                icon: Icon(
                    !replayService.isPause ? Icons.pause : Icons.play_arrow),
                onPressed: () {
                  replayService.toggleReplay();
                  setState(() {});
                },
              ),
              Text(replayService.progressTime > 0
                  ? _printDuration(
                      Duration(seconds: replayService.progressTime.toInt()))
                  : '00:00:00'),
              Expanded(
                child: Slider(
                  value: min(
                      replayService.progressTime / replayService.gameTime * 100,
                      100),
                  min: 0,
                  max: 100,
                  onChanged: (newValue) {
                    double newTime = (newValue * replayService.gameTime) / 100;
                    replayService.seekToTime(newTime);
                    setState(() {});
                  },
                ),
              ),
              Text(replayService.gameTime > 0
                  ? _printDuration(
                      Duration(seconds: replayService.gameTime.toInt()))
                  : '00:00:00'),
              TextButton(
                style: ButtonStyle(
                  backgroundColor: replayService.replaySpeedValue == 1
                      ? MaterialStateProperty.all(Colors.blue)
                      : MaterialStateProperty.all(Colors.white),
                ),
                onPressed: () {
                  replayService.replaySpeedValue = 1;
                  setState(() {});
                },
                child: const Text('x1'),
              ),
              TextButton(
                style: ButtonStyle(
                  backgroundColor: replayService.replaySpeedValue == 2
                      ? MaterialStateProperty.all(Colors.blue)
                      : MaterialStateProperty.all(Colors.white),
                ),
                onPressed: () {
                  replayService.replaySpeedValue = 2;
                  setState(() {});
                },
                child: const Text('x2'),
              ),
              TextButton(
                style: ButtonStyle(
                  backgroundColor: replayService.replaySpeedValue == 4
                      ? MaterialStateProperty.all(Colors.blue)
                      : MaterialStateProperty.all(Colors.white),
                ),
                onPressed: () {
                  replayService.replaySpeedValue = 4;
                  setState(() {});
                },
                child: const Text('x4'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
