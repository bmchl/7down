class RoomUser {
  String uid;
  String username;
  String avatarUrl = '';
  bool notifications = true;

  RoomUser(
      {required this.uid,
      required this.username,
      this.avatarUrl = '',
      this.notifications = true});
}
