import 'dart:convert';

import 'package:firebase_database/firebase_database.dart';
import 'package:flutterapp/classes/environment.dart';
import 'package:flutterapp/classes/game_info.dart';
import 'package:flutterapp/services/request_service.dart';

class GameInfoService {
  Future<List<GameInfo>> fetchGames() async {
    var requestService = RequestService();

    try {
      // Call the getRequest method on the instance
      var response = await requestService.getRequest("games");

      print("Response status code: ${response.statusCode}");
      print("Response body: ${response.body}");

      // Decode the JSON response into a List<dynamic>
      List<dynamic> decodedList = jsonDecode(response.body);

      print("Decoded list: $decodedList");

      // Ensure the decodedList is a List<Map<String, dynamic>> before mapping
      if (decodedList is List &&
          decodedList.every((element) => element is Map<String, dynamic>)) {
        List<GameInfo> gamesRes = [];
        for (var game in decodedList) {
          print("Game: $game");
          GameInfo info = GameInfo(
            id: game['id'],
            name: game['gameName'],
            difficulty: game['difficulty'] == 0 ? "FACILE" : "DIFFICILE",
            creator: game['creator'] ?? "",
            likes: game['likes'] == null ? '0' : game['likes'].toString(),
            plays: game['plays'] == null ? '0' : game['plays'].toString(),
            creationDate: game['creationDate'] == null
                ? null
                : DateTime.parse(game['creationDate']),
            imageUrl: Environment.serverUrl + game['image'],
            image1Url: Environment.serverUrl + game['image1'],
          );
          if (game['creator'] != null) {
            DatabaseReference _profileRef = FirebaseDatabase.instance
                .reference()
                .child('users')
                .child(game['creator']);
            final dataSnapshot = await _profileRef.once();
            Map<dynamic, dynamic>? profileData =
                dataSnapshot.snapshot.value as Map<dynamic, dynamic>?;

            if (profileData != null) {
              info.setCreatorName(profileData['username']);
            }
          }
          gamesRes.add(info);
        }
        return gamesRes;
      } else {
        throw Exception("Invalid response format");
      }
    } catch (e) {
      throw Exception("Failed to fetch games: $e");
    } finally {
      // Don't forget to dispose of the instance when done
      requestService.dispose();
    }
  }

  Future<List<GameInfo>> fetchGamesByCreator(String id) async {
    var requestService = RequestService();

    try {
      // add new endpoint to the getRequest method
      // var response = await requestService.getRequest("games/creator/$id");

      // for now, just fetch all games and filter by creator
      var response = await requestService.getRequest("games");

      List<dynamic> decodedList = jsonDecode(response.body);

      if (decodedList is List &&
          decodedList.every((element) => element is Map<String, dynamic>)) {
        List<GameInfo> gamesRes = [];
        for (var game in decodedList) {
          if (game['creator'] == id) {
            GameInfo info = GameInfo(
              id: game['id'],
              name: game['gameName'],
              difficulty: game['difficulty'] == 0 ? "FACILE" : "DIFFICILE",
              creator: game['creator'] ?? "",
              likes: game['likes'] == null ? '0' : game['likes'].toString(),
              plays: game['plays'] == null ? '0' : game['plays'].toString(),
              creationDate: game['creationDate'] == null
                  ? null
                  : DateTime.parse(game['creationDate']),
              imageUrl: Environment.serverUrl + game['image'],
              image1Url: Environment.serverUrl + game['image1'],
            );
            if (game['creator'] != null) {
              DatabaseReference _profileRef = FirebaseDatabase.instance
                  .reference()
                  .child('users')
                  .child(game['creator']);
              final dataSnapshot = await _profileRef.once();
              Map<dynamic, dynamic>? profileData =
                  dataSnapshot.snapshot.value as Map<dynamic, dynamic>?;

              if (profileData != null) {
                info.setCreatorName(profileData['username']);
              }
            }
            gamesRes.add(info);
          }
        }
        return gamesRes;
      } else {
        throw Exception("Invalid response format");
      }
    } catch (e) {
      throw Exception("Failed to fetch games: $e");
    } finally {
      requestService.dispose();
    }
  }

  Future<GameInfo> fetchGame(String gameId) async {
    var requestService = RequestService();

    try {
      var response = await requestService.getRequest("games/$gameId");

      print("Response status code: ${response.statusCode}");
      print("Response body: ${response.body}");

      Map<String, dynamic> decodedMap = jsonDecode(response.body);

      print("Decoded map: $decodedMap");

      GameInfo gameRes = GameInfo(
        id: decodedMap['id'],
        name: decodedMap['gameName'],
        difficulty: decodedMap['difficulty'] == 0 ? "FACILE" : "DIFFICILE",
        creator: decodedMap['creator'] ?? "",
        likes:
            decodedMap['likes'] == null ? '0' : decodedMap['likes'].toString(),
        plays:
            decodedMap['plays'] == null ? '0' : decodedMap['plays'].toString(),
        creationDate: decodedMap['creationDate'] == null
            ? null
            : DateTime.parse(decodedMap['creationDate']),
        imageUrl: Environment.serverUrl + decodedMap['image'],
        image1Url: Environment.serverUrl + decodedMap['image1'],
        differences: decodedMap['imageDifference'].map<List<List<int>>>((item) {
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
              return innerItem as int;
            }).toList();
          }).toList();
        }).toList(),
      );

      return gameRes;
    } catch (e) {
      throw Exception("Failed to fetch game: $e");
    } finally {
      requestService.dispose();
    }
  }
}
