import 'package:flutterapp/classes/game_info.dart';
import 'package:flutterapp/classes/game_match.dart';

class GameSession {
  GameInfo info;
  GameMatch match;
  String mode = 'classic';
  String id = '';
  bool specator = false;

  GameSession(
      {required this.info,
      required this.match,
      this.mode = 'classic',
      this.id = '',
      this.specator = false});
}
