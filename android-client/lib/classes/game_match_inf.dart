class GameMatchInfo {
  final String? matchId;
  final String? mapId;
  final String gamemode;
  final int startTime;
  final String? visibility;
  final int? endTime;
  final List<Player> players;
  final List<dynamic> spectators;
  final int? gameDuration;
  String winnerSocketId;
  String? winnerUsername;
  Duration? gameTime;

  GameMatchInfo({
    required this.matchId,
    required this.mapId,
    required this.gamemode,
    required this.startTime,
    this.visibility,
    this.endTime,
    required this.players,
    required this.spectators,
    this.gameDuration,
    this.winnerUsername,
    this.gameTime,
    this.winnerSocketId = '',
  });

  factory GameMatchInfo.fromJson(Map<String, dynamic> json) {
    var gameDuration = json['gameDuration'] as int? ?? 120;
    var startTime = json['startTime'] as int;
    var endTime = json['endTime'] as int? ?? startTime + (gameDuration * 1000);
    var gameTime = Duration(milliseconds: endTime - startTime);

    String winnerSocketId = json['winnerSocketId'] ?? '';
    String? winnerUsername;

    var playersList =
        List<Player>.from(json['players'].map((x) => Player.fromJson(x)));

    for (var player in playersList) {
      if (player.id == winnerSocketId) {
        winnerUsername = player.name;
        break;
      }
    }

    return GameMatchInfo(
      matchId: json['matchId'] as String? ?? '',
      mapId: json['mapId'] as String? ?? '',
      gamemode: json['gamemode'] as String? ?? 'classic',
      startTime: startTime,
      visibility: json['visibility'] as String?,
      endTime: endTime,
      players: playersList,
      spectators: List<dynamic>.from(json['spectators'].map((x) => x)),
      gameDuration: gameDuration,
      winnerUsername: winnerUsername,
      gameTime: gameTime,
      winnerSocketId: winnerSocketId,
    );
  }
}

class Player {
  final String id;
  final String uid;
  final String name;
  final String profilePic;
  final bool creator;
  final int found;

  Player({
    required this.id,
    required this.uid,
    required this.name,
    required this.profilePic,
    required this.creator,
    required this.found,
  });

  factory Player.fromJson(Map<String, dynamic> json) {
    return Player(
      id: json['id'] as String? ?? '',
      uid: json['uid'] as String? ?? '',
      name: json['name'] as String? ?? '',
      profilePic: json['profilePic'] as String? ?? '',
      creator: json['creator'] as bool? ?? false,
      found: json['found'] as int? ?? 0,
    );
  }
}
