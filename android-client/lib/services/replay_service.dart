import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';
import 'package:rxdart/rxdart.dart';

import '../classes/vec2.dart';

class ReplayEvent {
  String type;
  double timestamp;
  int player;
  Map<String, dynamic> data;

  ReplayEvent(this.type, this.timestamp, this.player, this.data);

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'timestamp': timestamp,
      'player': player,
      'data': data,
    };
  }

  factory ReplayEvent.fromJson(Map<dynamic, dynamic> json) {
    return ReplayEvent(
      json['type'] as String,
      (json['timestamp'] as num).toDouble(),
      json['player'] as int,
      Map<String, dynamic>.from(json['data']),
    );
  }
}

class ReplayService {
  final BehaviorSubject<dynamic> blinkEmit = BehaviorSubject<dynamic>();
  final BehaviorSubject<dynamic> resetImage = BehaviorSubject<dynamic>();
  final BehaviorSubject<dynamic> drawError = BehaviorSubject<dynamic>();
  final BehaviorSubject<dynamic> timePositionChanged =
      BehaviorSubject<dynamic>();

  int progressIndex = 0;
  double progressTime = 0;
  double gameTime = 0;
  List<ReplayEvent> events = [];
  bool isDisplaying = false;
  Timer? timerInterval;
  double replaySpeedValue = 1;
  bool isPause = false;
  double startGameTime = 0;
  int interval = 10;
  double timeBuffer = 1;
  bool isInReplayMode = false;
  bool isSavedReplay = false;

  late BuildContext context;

  late String uid;
  late String mapId;

  int getGameTime() {
    return gameTime.toInt().floor();
  }

  int getProgressTime() {
    return progressTime.toInt().floor();
  }

  double getTimeStamp() {
    return (DateTime.now().millisecondsSinceEpoch.toDouble() - startGameTime) /
        1000;
  }

  void logChat(int player, String message) {
    print("log Chat: $player, $message");
    events.add(ReplayEvent('chat', getTimeStamp(), player, {
      'value': message,
      'time': DateTime.now().millisecondsSinceEpoch.toDouble()
    }));
  }

  void logGlobalMessage(String message) {
    print("log Global Message: $message");
    events.add(
        ReplayEvent('globalMessage', getTimeStamp(), -1, {'value': message}));
  }

  void logClick(int player, int diff) {
    print("log Click: $player, $diff");
    events.add(ReplayEvent('click', getTimeStamp(), player, {
      'diff': diff,
      'time': DateTime.now().millisecondsSinceEpoch.toDouble()
    }));
  }

  void logError(int player, Vec2 coords) {
    print("log Error: $player, $coords");
    events.add(ReplayEvent('error', getTimeStamp(), player, {
      'coords': {'res': -1, 'x': coords.x, 'y': coords.y},
      'time': DateTime.now().millisecondsSinceEpoch.toDouble()
    }));
  }

  void logOtherError(int player) {
    print("log Other Error: $player");
    events.add(ReplayEvent('otherError', getTimeStamp(), player,
        {'time': DateTime.now().millisecondsSinceEpoch.toDouble()}));
  }

  void replayOrResume() {
    isInReplayMode = true;
    print(events);
    timerInterval = Timer.periodic(Duration(milliseconds: interval), (Timer t) {
      print(
          "XX 1 - ${progressTime >= gameTime + timeBuffer}, $progressTime, $gameTime, $timeBuffer");
      print(
          "XX 2 - ${progressIndex >= events.length}, $progressIndex, ${events.length}");

      progressTime += (interval * replaySpeedValue) / 1000;
      timePositionChanged.add(null);
      if (progressIndex < events.length) {
        ReplayEvent event = events[progressIndex];
        print(
            "progressTime: $progressTime, eventTime: ${event.timestamp}, event");
        print('event type is: ${event.type} $progressIndex');
        if (progressTime >= event.timestamp - timeBuffer) {
          switch (event.type) {
            case 'chat':
              print('playing chat');
              blinkEmit.add(event);
              break;
            case 'click':
              print('playing click');
              blinkEmit
                  .add({'diff': event.data['diff'], 'speed': replaySpeedValue});
              break;
            case 'error':
              print('playing error');
              drawError.add({
                'coords': event.data['coords'],
                'player': event.player,
                'time': event.data['time']
              });
              break;
            case 'playing otherError':
              print('other error');
              break;
            case 'playing globalMessage':
              print('globalMessage');
              blinkEmit.add(event);
              break;
          }
          progressIndex++;
        }
      }

      if (progressTime >= gameTime + timeBuffer) {
        print("XX - replay over");
        openEndDialog();
        pause();
      }
    });
  }

  void seekToTime(double newTime) {
    pause();
    progressTime = newTime;
    progressIndex =
        events.indexWhere((event) => event.timestamp >= newTime / 1000);
    if (progressIndex == -1) {
      progressIndex = 0;
    }
    events =
        events.where((event) => event.timestamp >= newTime / 1000).toList();
    if (!isPause) {
      resume();
    }
  }

  void setBuildContext(BuildContext context) {
    this.context = context;
  }

  void openEndDialog() {
    // this.customDialogService
    // .openDialog({
    //     title: 'Reprise de la partie terminée',
    //     confirm: 'Recommencer la reprise vidéo',
    //     cancel: 'Revenir à la page principale',
    // })
    // .afterClosed()
    // .subscribe((result: boolean) => {
    //     if (result) {
    //         this.reset();
    //         this.resume();
    //     } else {
    //         this.zone.run(() => {
    //             this.isDisplaying = false;
    //             this.reset();
    //             this.router.navigate(['/classic']);
    //         });
    //     }
    // });

    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: Text('Reprise de la partie terminée'),
          actions: [
            TextButton(
              onPressed: () {
                reset();
                Navigator.of(dialogContext).pop();
                Navigator.of(context).pop();
              },
              child: Text('Revenir à la page principale'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(dialogContext).pop();
                reset();
                resume();
              },
              child: Text('Recommencer la reprise vidéo'),
            ),
            if (!isSavedReplay)
              TextButton(
                onPressed: () {
                  saveReplay();
                  Navigator.of(dialogContext).pop();
                  Navigator.of(context).pop();
                },
                child: Text('Sauvegarder la reprise'),
              ),
          ],
        );
      },
    );
  }

  Future<void> saveReplay() async {
    await Firebase.initializeApp();
    final db = FirebaseDatabase.instance.reference();
    final userRef = db.child('users').child(uid).child('replayEvents');

    final replayRef = userRef.push();

    final eventsJson = events.map((e) => e.toJson()).toList();

    replayRef.set({
      'startGameTime': startGameTime,
      'gameTime': gameTime,
      'events': eventsJson,
      'mapId': mapId
    }).then((_) {
      print('Replay events saved successfully!');
    }).catchError((error) {
      print('Error saving replay events: $error');
    });
  }

  void replay() {
    isInReplayMode = true;
    replayOrResume();
  }

  void pause() {
    isPause = true;
    timerInterval?.cancel();
  }

  void resume() {
    isPause = false;
    replayOrResume();
  }

  void toggleReplay() {
    isPause ? resume() : pause();
  }

  void setGameTime(double time) {
    gameTime = time / 1000;
  }

  void saveStartTime() {
    startGameTime = DateTime.now().millisecondsSinceEpoch.toDouble();
  }

  void reset() {
    progressIndex = 0;
    progressTime = 0;
    resetImage.add(null);
  }

  void dispose() {
    progressIndex = 0;
    progressTime = 0;
    gameTime = 0;
    events = [];
    timerInterval?.cancel();
    timerInterval = null;
    replaySpeedValue = 1;
    isPause = false;
    startGameTime = 0;
    isDisplaying = false;
    isInReplayMode = false;
  }
}
