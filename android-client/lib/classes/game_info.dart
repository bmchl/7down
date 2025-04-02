import 'package:flutterapp/classes/like.dart';

class GameInfo {
  final String id;
  final String name;
  final String difficulty;
  final String imageUrl;
  final String image1Url;
  final String creator;
  String creatorName = "";
  String likes;
  String plays;
  final DateTime? creationDate;
  final List<List<List<int>>> differences;
  Like like = Like.none;

  GameInfo({
    required this.id,
    required this.name,
    required this.difficulty,
    this.imageUrl = "",
    this.image1Url = "",
    required this.creator,
    required this.likes,
    required this.plays,
    this.creationDate,
    this.differences = const [
      [[]]
    ],
  });

  void setCreatorName(String newCreatorName) {
    creatorName = newCreatorName;
  }

  void setLike(Like newLike) {
    like = newLike;
  }

  int getPlays() {
    return int.parse(plays);
  }

  int getLikes() {
    return int.parse(likes);
  }

  String getPlaysText() {
    return '${getPlays()} ${getPlays() == 1 ? 'play' : 'plays'}';
  }

  String getLikesText() {
    return '${getLikes()} ${getLikes() == 1 ? 'like' : 'likes'}';
  }
}
