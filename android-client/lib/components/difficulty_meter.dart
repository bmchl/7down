import 'package:flutter/material.dart';

class DifficultyMeter extends StatelessWidget {
  final String difficulty;
  bool showText = false;
  DifficultyMeter({Key? key, required this.difficulty, this.showText = false})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    Color meterColor;
    switch (difficulty.toUpperCase()) {
      case 'FACILE':
        meterColor = Colors.green;
        break;
      case 'MOYEN':
        meterColor = Colors.yellow;
        break;
      case 'DIFFICILE':
        meterColor = Colors.red;
        break;
      default:
        meterColor = Colors.grey;
    }

    return Row(children: [
      Container(
        width: 20.0,
        height: 10.0,
        decoration: BoxDecoration(
          color: meterColor,
          borderRadius: BorderRadius.circular(5.0),
        ),
      ),
      if (showText) const SizedBox(width: 8),
      if (showText)
        Text(
          difficulty,
          style: TextStyle(
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white
                : Colors.black,
            fontSize: 16,
          ),
        ),
    ]);
  }
}
