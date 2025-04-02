class Player {
  final String id;
  final String uid;
  final String name;
  final String profilePic;
  int found = 0;
  bool creator = false;
  bool forfeitter = false;

  Player(
      {required this.id,
      required this.uid,
      required this.name,
      required this.profilePic,
      this.found = 0,
      this.creator = false,
      this.forfeitter = false});
}
