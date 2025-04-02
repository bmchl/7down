import 'package:flutterapp/classes/room_user.dart';

class ChatRoom {
  final String id;
  final String name;
  RoomUser creator = RoomUser(uid: '', username: '');
  String creationDate = '';
  List<RoomUser> users = [];
  bool isPrivate = false;
  bool isMatch = false;

  ChatRoom({
    required this.id,
    required this.name,
    this.creationDate = '',
    bool isPrivate = false,
    bool isMatch = false,
  });

  @override
  String toString() {
    return 'ChatRoom{id: $id, name: $name, creator: $creator, creationDate: $creationDate, users: $users, isPrivate: $isPrivate, isMatch: $isMatch}';
  }
}
