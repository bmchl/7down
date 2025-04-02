import 'package:flutterapp/classes/room_user.dart';

class ChatMessage {
  RoomUser sender;
  String message;
  String timestamp;

  ChatMessage({
    required this.sender,
    required this.message,
    required this.timestamp,
  });
}
