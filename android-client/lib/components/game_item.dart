import 'package:flutter/material.dart';
import 'package:flutterapp/classes/game_info.dart';
import 'package:flutterapp/components/difficulty_meter.dart';
import 'package:flutterapp/screens/auth_wrapper.dart';
import 'package:flutterapp/screens/detail.dart';

class GameItem extends StatelessWidget {
  final GameInfo gameInfo;
  final bool compact;

  const GameItem({Key? key, required this.gameInfo, this.compact = false})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
        onTap: () => openDetail(context),
        child: Card(
            child: Padding(
          padding: EdgeInsets.all(15),
          child: Stack(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Add a Container to set the size of the image
                  Container(
                    width: compact ? 200 : 320.0, // Adjust the width as needed
                    height:
                        compact ? 150 : 240.0, // Adjust the height as needed
                    child: Image.network(
                      gameInfo.imageUrl,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) =>
                          const Icon(Icons.error),
                    ),
                  ),
                  const SizedBox(
                      width: 8.0), // Add spacing between image and text
                  Expanded(
                      child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            gameInfo.name,
                            style: const TextStyle(
                              fontSize: 18.0,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          // Add spacing between title and creator
                          compact
                              ? const SizedBox(height: 0.0)
                              : Text(
                                  gameInfo.creatorName,
                                ),

                          const SizedBox(
                              height:
                                  8.0), // Add spacing between creator and details
                          Row(
                            children: [
                              DifficultyMeter(difficulty: gameInfo.difficulty),
                              const SizedBox(
                                  width:
                                      8.0), // Add spacing between difficulty and plays
                              Text(gameInfo.getPlaysText()),
                              const SizedBox(
                                  width:
                                      8.0), // Add spacing between plays and likes
                              Text(gameInfo.getLikesText()),
                            ],
                          ),
                          const SizedBox(height: 4.0),
                          Text(
                            'Created on: ${gameInfo.creationDate?.toLocal().toString()}',
                            style: TextStyle(
                              color: Theme.of(context).primaryColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )),
                ],
              ),
              Positioned(
                  top: 8.0,
                  right: 8.0,
                  child: CircleAvatar(
                    backgroundColor: Theme.of(context).primaryColor,
                    child: IconButton(
                      icon: const Icon(Icons.arrow_forward),
                      color: Colors.white,
                      onPressed: () {
                        openDetail(context);
                      },
                    ),
                  )),
            ],
          ),
        )));
  }

  void openDetail(BuildContext context) {
    // Navigate to the detail screen
    // You can pass the gameInfo object to the detail screen
    // to display more details about the game
    print("xx 2 ${gameInfo.differences}");
    Navigator.push(
        context,
        MaterialPageRoute(
            builder: (context) => AuthenticationWrapper(
                child: Expanded(child: Detail(gameInfo: gameInfo)))));
  }
}
