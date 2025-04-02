import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutterapp/classes/game_match_inf.dart';
import 'package:flutterapp/services/request_service.dart';

class GameMatchService {
  Future<List<GameMatchInfo>> fetchGameMatches() async {
    var requestService = RequestService();
    String currentUserUid = FirebaseAuth.instance.currentUser!.uid;
    try {
      var response =
          await requestService.getRequest("games/history?uid=$currentUserUid");

      print("Response status code: ${response.statusCode}");
      print("Response body: ${response.body}");

      List<dynamic> decodedList = jsonDecode(response.body);
      if (decodedList is List) {
        return decodedList
            .where((element) =>
                element is Map<String, dynamic>) // Ensure each element is a map
            .map((gameMatchJson) =>
                GameMatchInfo.fromJson(gameMatchJson as Map<String, dynamic>))
            .toList();
      } else {
        throw Exception("Invalid response format");
      }
    } catch (e) {
      print("An error occurred: $e"); // Logging the error
      rethrow; // Rethrowing the error for further handling
    } finally {
      requestService.dispose(); // Ensure the requestService is disposed off
    }
  }
}
