import 'dart:core';

import 'package:flutterapp/classes/player.dart';

class GameMatch {
  final String matchId;
  final String mapId;
  final List<Player> players;
  int startTime = 0;
  String winnerSocketId = '';
  List<int> differenceIndex = [];
  int gamesIndex = 0;
  List<String> spectators = [];
  String gamemode = "";
  List<int> foundDifferencesIndex = [];
  String? visibility;
  int gameDuration;
  int? bonusTimeOnHit;
  bool cheatAllowed;

  GameMatch(
      {required this.matchId,
      this.mapId = "",
      required this.players,
      this.startTime = 0,
      this.winnerSocketId = '',
      this.differenceIndex = const [],
      this.gamesIndex = 0,
      this.spectators = const [],
      this.gamemode = "",
      this.foundDifferencesIndex = const [],
      this.visibility,
      required this.gameDuration,
      this.bonusTimeOnHit,
      required this.cheatAllowed});
}
