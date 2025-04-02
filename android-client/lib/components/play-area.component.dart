import 'dart:async';
import 'dart:ui' as ui; // Use 'ui' prefix for dart:ui

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';
import 'package:flutterapp/classes/game_session.dart';
import 'package:flutterapp/classes/vec2.dart';
import 'package:flutterapp/services/replay_service.dart';
import 'package:shake/shake.dart';

import '../services/socket_client_service.dart';

class PlayAreaComponent extends StatefulWidget {
  final List<String> images;
  final List<List<List<int>>> differences;
  final GameSession gameSession;
  final ReplayService replayService;

  const PlayAreaComponent(
      {Key? key,
      required this.images,
      required this.differences,
      required this.gameSession,
      required this.replayService})
      : super(key: key);

  @override
  // ignore: no_logic_in_create_state
  PlayAreaComponentScreen createState() => PlayAreaComponentScreen(
        images: images,
        differences: differences,
        gameSession: gameSession,
        replayService: replayService,
      );
}

class PlayAreaComponentScreen extends State<PlayAreaComponent> {
  SocketClientService socketService = SocketClientService();
  List<int> found = [];
  final List<String> images;
  final List<List<List<int>>> differences;
  final GameSession gameSession;
  final ReplayService replayService;
  late AudioPlayer audioPlayer;
  late AudioCache audioCache;
  final player = AudioPlayer();
  bool isImagesLoaded = false;
  bool isWaiting = false;
  bool isCheatMode = false;
  bool cheatBlinkVisible = true;
  Timer? cheatBlinkTimer;

  int showDifference = -1;
  int blinkState = -1;
  Vec2? errorPosition;
  ui.Image? originalImage;
  ui.Image? modifiedImage;
  late StreamSubscription blinkSubscription;
  late StreamSubscription resetSubscription;
  late StreamSubscription drawErrorSubscription;

  Vec2? previousCoordinates;
  Vec2? currentCoordinates;
  bool onTimeOut = false;

  int selectedPlayer = -1;
  String rectColor = "red";

  ShakeDetector? shakeDetector;

  PlayAreaComponentScreen({
    required this.images,
    required this.differences,
    required this.gameSession,
    required this.replayService,
  });

  @override
  void initState() {
    super.initState();
    connectAndSetupSocket();

    resetSubscription = replayService.resetImage.listen((_) {
      print('resetting image');
      setState(() {
        found = [];
        showDifference = -1;
        blinkState = -1;
      });
    });

    blinkSubscription = replayService.blinkEmit.listen((data) {
      print('blinking $data');
      blinkDifference(data['diff'], data['speed']);
      if (!found.contains(data["diff"])) {
        setState(() {
          found.add(data["diff"]);
        });
      }
    });

    drawErrorSubscription = replayService.drawError.listen((data) {
      print('drawing error $data');
      drawError(data['coords']['x'].toDouble(), data['coords']['y'].toDouble());
    });

    // Load the images
    loadImages(images[0], images[1]);

    // AUdio things of DART
    audioPlayer = AudioPlayer();
    audioCache = AudioCache();

    shakeDetector = ShakeDetector.autoStart(
      onPhoneShake: () {
        setState(() {
          isCheatMode = !isCheatMode;
          print("Cheat mode: $isCheatMode");
        });
      },
    );
  }

  @override
  void dispose() {
    shakeDetector?.stopListening();
    super.dispose();
  }

  Future<void> drawDifference() async {
    await audioPlayer.play(AssetSource('Correct_Answer_Sound_effect.mp3'));
  }

  drawError(double x, double y) {
    setState(() {
      isWaiting = true;
      errorPosition = Vec2(x: x, y: y);
      // Trigger the error message to disappear after a few seconds
      Future.delayed(const Duration(seconds: 1), () {
        setState(() {
          errorPosition = null;
          isWaiting = false;
        });
      });
    });
    audioPlayer.play(AssetSource('Wrong_Answer_Sound_effect.mp3'));
  }

  Future<void> loadImages(String originalUrl, String modifiedUrl) async {
    originalImage = await _loadImageFromNetwork(originalUrl);
    modifiedImage = await _loadImageFromNetwork(modifiedUrl);
    isImagesLoaded = true;
    setState(() {});
  }

  Future<ui.Image> _loadImageFromNetwork(String imageUrl) async {
    final completer = Completer<ui.Image>();
    final ImageStream stream =
        NetworkImage(imageUrl).resolve(const ImageConfiguration());
    void imageListener(ImageInfo info, bool _) {
      completer.complete(info.image);
      stream.removeListener(ImageStreamListener(imageListener));
    }

    stream.addListener(ImageStreamListener(imageListener));
    return completer.future;
  }

  @override
  void didUpdateWidget(covariant PlayAreaComponent oldWidget) {
    print("Did update widget ${widget.images} ${oldWidget.images}");
    super.didUpdateWidget(oldWidget);
    // Check if images list has changed
    if (widget.images[0] != oldWidget.images[0] &&
        widget.images[1] != oldWidget.images[1]) {
      print("Images have changed");
      loadImages(widget.images[0], widget.images[1]);
    }
  }

  void onTapDetected(TapUpDetails details) {
    if (gameSession.specator ||
        gameSession.match.winnerSocketId.length > 3 ||
        isWaiting) {
      return;
    }
    final RenderBox renderBox = context.findRenderObject() as RenderBox;

    double updatedX = details.localPosition.dx;
    double updatedY = details.localPosition.dy;

    print("Tap at: $updatedX, $updatedY");

    if (updatedX > 640 && updatedX < 640 + 90) {
      return;
    }

    if (updatedX >= 640 + 90) {
      updatedX -= (640 + 90);
    }

    if (updatedX < 0 ||
        updatedY < 0 ||
        updatedY > renderBox.size.height ||
        updatedX > renderBox.size.width) {
      return;
    }

    final Vec2 tapPosition = Vec2(
      x: updatedX,
      y: updatedY,
    );

    print("Tap Reg at: $updatedX, $updatedY");

    if (gameSession.mode == "classic") isWaiting = true;
    setState(() {});

    socketService
        .send("${gameSession.mode == "classic" ? "c" : "tl"}/validate-coords", {
      "x": tapPosition.x.floor(),
      "y": tapPosition.y.floor(),
      "found": found,
    });
  }

  void toggleCheatMode() {
    if (replayService.isInReplayMode ||
        gameSession.specator ||
        replayService.isDisplaying ||
        gameSession.match.winnerSocketId.isNotEmpty ||
        !gameSession.match.cheatAllowed) {
      return;
    }

    setState(() {
      isCheatMode = !isCheatMode;
    });

    if (isCheatMode) {
      cheatBlinkTimer?.cancel();
      cheatBlinkTimer =
          Timer.periodic(const Duration(milliseconds: 125), (Timer timer) {
        if (replayService.isInReplayMode ||
            gameSession.specator ||
            replayService.isDisplaying ||
            gameSession.match.winnerSocketId.isNotEmpty) {
          cheatBlinkTimer?.cancel();
          return;
        }

        setState(() {
          cheatBlinkVisible = !cheatBlinkVisible;
        });
      });
    } else {
      cheatBlinkTimer?.cancel();
      cheatBlinkVisible = true; // Ensure it's reset when not in cheat mode
    }
  }

  Future<void> connectAndSetupSocket() async {
    await socketService.connect();

    socketService.on<Map<String, dynamic>>('s/draw-hint', (data) {
      print('here $data');
      int toIndex = int.tryParse(data["toIndex"].toString()) ?? -1;
      print('toIndex: $toIndex');
      bool shouldDrawHint = toIndex == -1 ||
          (toIndex != -1 &&
              gameSession.match.players[toIndex].id ==
                  socketService.socket?.id);
      print('shouldDrawHint: $shouldDrawHint');
      if (gameSession.specator || !shouldDrawHint) {
        return;
      }

      setState(() {
        previousCoordinates = Vec2(
          x: data["x"],
          y: data["y"],
        );
        currentCoordinates = Vec2(
          x: data["x"] + data["width"],
          y: data["y"] + data["height"],
        );
        rectColor = data["color"];
      });

      Future.delayed(const Duration(seconds: 3), () {
        setState(() {
          onTimeOut = false;
          previousCoordinates = null;
          currentCoordinates = null;
          rectColor = "red";
        });
      });
    });

    socketService.on<Map<String, dynamic>>('notify-difference-found', (data) {
      if (gameSession.mode == "classic") {
        blinkDifference(data["diff"], 1);
        if (!found.contains(data["diff"])) {
          setState(() {
            found.add(data["diff"]);
          });
        }
        print("Found: $found ${data["diff"]} ${differences[0]}");
        replayService.logClick(0, data["diff"]);
        drawDifference();
      }
    });

    socketService.on<Map<String, dynamic>>("validate-coords", (data) {
      print("Received data from server: $data");
      if (data["res"] >= 0) {
        if (gameSession.mode == "classic") {
          blinkDifference(data["res"], 1);
          if (!found.contains(data["res"])) {
            setState(() {
              found.add(data["res"]);
            });
          }
          print("Found: $found ${data["res"]} ${differences[0]}");
          replayService.logClick(0, data["res"]);
          isWaiting = false;
          drawDifference();
        }
      } else if (data["res"] == -1) {
        replayService.logError(
            0, Vec2(x: data["x"].toDouble(), y: data["y"].toDouble()));
        drawError(data["x"].toDouble(), data["y"].toDouble());
      }
    });
  }

  void blinkDifference(int diffIndex, double speed) {
    int i = 0;
    setState(() {
      blinkState = 0;
      showDifference = diffIndex;
    });
    Timer.periodic(Duration(milliseconds: (125 / speed).round()),
        (Timer timer) {
      setState(() {
        blinkState = i % 2;
      });
      print("Show difference: $showDifference");
      i++;
      if (i > 8) {
        print('Timer end');
        timer.cancel();
        setState(() {
          showDifference = diffIndex;
          blinkState = -1;
        });
        // Call endHitDetect here if needed
      }
    });
  }

  void panStartEvent(DragStartDetails details) {
    if (!gameSession.specator || onTimeOut) {
      return;
    }

    print("Start drawing");

    final RenderBox renderBox = context.findRenderObject() as RenderBox;

    double updatedX = details.localPosition.dx;
    double updatedY = details.localPosition.dy;

    print("Tap at: $updatedX, $updatedY");

    if (updatedX > 640 && updatedX < 640 + 90) {
      return;
    }

    if (updatedX >= 640 + 90) {
      updatedX -= (640 + 90);
    }

    if (updatedX < 0 ||
        updatedY < 0 ||
        updatedY > renderBox.size.height ||
        updatedX > renderBox.size.width) {
      return;
    }

    final Vec2 tapPosition = Vec2(
      x: updatedX,
      y: updatedY,
    );

    print("Tap Reg at: $updatedX, $updatedY");

    setState(() {
      previousCoordinates = tapPosition;
    });
  }

  void panUpdateEvent(DragUpdateDetails details) {
    if (!gameSession.specator || onTimeOut) {
      return;
    }

    final RenderBox renderBox = context.findRenderObject() as RenderBox;

    double updatedX = details.localPosition.dx;
    double updatedY = details.localPosition.dy;

    print("Tap at: $updatedX, $updatedY");

    if (updatedX > 640 && updatedX < 640 + 90) {
      return;
    }

    if (updatedX >= 640 + 90) {
      updatedX -= (640 + 90);
    }

    if (updatedX < 0 ||
        updatedY < 0 ||
        updatedY > renderBox.size.height ||
        updatedX > renderBox.size.width) {
      return;
    }

    final Vec2 tapPosition = Vec2(
      x: updatedX,
      y: updatedY,
    );

    print("Tap Reg at: $updatedX, $updatedY");

    setState(() {
      currentCoordinates = tapPosition;
    });
  }

  void panEndEvent(DragEndDetails details) {
    if (!gameSession.specator || onTimeOut) {
      return;
    }

    if (previousCoordinates == null || currentCoordinates == null) {
      return;
    }

    socketService.send('s/draw-hint', {
      "x": previousCoordinates!.x.floor(),
      "y": previousCoordinates!.y.floor(),
      "width": currentCoordinates!.x.floor() - previousCoordinates!.x.floor(),
      "height": currentCoordinates!.y.floor() - previousCoordinates!.y.floor(),
      "toIndex": selectedPlayer
    });

    setState(() {
      onTimeOut = true;
    });

    Future.delayed(const Duration(seconds: 3), () {
      setState(() {
        onTimeOut = false;
        previousCoordinates = null;
        currentCoordinates = null;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!isImagesLoaded) {
      return const Center(child: CircularProgressIndicator());
    }

    List<DropdownMenuItem<int>> getPlayerDropdownItems() {
      List<DropdownMenuItem<int>> items = [
        DropdownMenuItem(
            value: -1,
            child: Text(AppLocalizations.of(context)!.translate("All Players")))
      ];
      for (int i = 0; i < gameSession.match.players.length; i++) {
        items.add(DropdownMenuItem(
          value: i,
          child: Text(gameSession.match.players[i].name),
        ));
      }
      return items;
    }

    Widget playerSelectDropdown() {
      return Positioned(
          bottom: -15,
          left: 0,
          right: 0,
          child: Visibility(
            visible: gameSession.specator,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(AppLocalizations.of(context)!.translate("Show Hint To")),
                DropdownButton<int>(
                  value: selectedPlayer,
                  items: getPlayerDropdownItems(),
                  onChanged: (value) {
                    setState(() {
                      selectedPlayer = value!;
                    });
                  },
                ),
              ],
            ),
          ));
    }

    return Stack(
      children: [
        Transform.scale(
            scale: 0.9,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onPanStart: panStartEvent,
              onPanUpdate: panUpdateEvent,
              onPanEnd: panEndEvent,
              onTapUp: onTapDetected,
              child: CustomPaint(
                painter: GameImagesPainter(
                    originalImage: originalImage!,
                    modifiedImage: modifiedImage!,
                    differences: differences,
                    showDifference: showDifference,
                    blinkState: blinkState,
                    found: found,
                    errorPosition: errorPosition,
                    gameSession: gameSession,
                    previousCoordinates: previousCoordinates,
                    currentCoordinates: currentCoordinates,
                    rectColor: rectColor,
                    isCheatMode: isCheatMode,
                    cheatBlinkVisible: cheatBlinkVisible),
                size: const Size(((640 + 40) * 2 + 10.0), 480),
              ),
            )),
        playerSelectDropdown(),
        // button to enable cheat mode
        Positioned(
          top: 0,
          right: 0,
          child: ElevatedButton(
            onPressed: toggleCheatMode,
            child: Text(isCheatMode
                ? AppLocalizations.of(context)!.translate("Disable Cheat Mode")
                : AppLocalizations.of(context)!.translate("Enable Cheat Mode")),
          ),
        ),
      ],
    );
  }
}

Color getColorFromString(String colorName) {
  switch (colorName.toLowerCase()) {
    case 'red':
      return Colors.red;
    case 'yellow':
      return Colors.yellow;
    case 'green':
      return Colors.green;
    case 'blue':
      return Colors.blue;
    // Add more colors as needed
    default:
      return Colors.black; // Default color if not recognized
  }
}

class GameImagesPainter extends CustomPainter {
  final ui.Image originalImage;
  final ui.Image modifiedImage;
  final List<List<List<int>>> differences;
  final int showDifference;
  final int blinkState;
  final List<int> found;
  final Vec2? errorPosition;
  final GameSession gameSession;

  final Vec2? previousCoordinates;
  final Vec2? currentCoordinates;

  final String rectColor;

  final bool isCheatMode;
  final bool cheatBlinkVisible;

  GameImagesPainter(
      {required this.originalImage,
      required this.modifiedImage,
      required this.differences,
      required this.showDifference,
      required this.blinkState,
      required this.found,
      required this.errorPosition,
      required this.gameSession,
      required this.isCheatMode,
      required this.cheatBlinkVisible,
      this.previousCoordinates,
      this.currentCoordinates,
      this.rectColor = "red"});

  @override
  void paint(ui.Canvas canvas, ui.Size size) {
    const double padding = 0;
    const double gap = 90;
    const double availableWidthPerImage = 640;
    const double availableHeight = 480;
    final ui.Paint backgroundPaint = ui.Paint()
      ..color = const ui.Color(0xFFF0F0F0).withOpacity(0);
    print("Size: ${size.width}, ${size.height}");

    canvas.drawRect(
      ui.Rect.fromLTWH(0, 0, size.width, size.height),
      backgroundPaint,
    );

    print("Drawing images");
    canvas.drawImageRect(
      originalImage,
      ui.Rect.fromLTWH(0, 0, originalImage.width.toDouble(),
          originalImage.height.toDouble()),
      const ui.Rect.fromLTWH(
          padding, padding, availableWidthPerImage, availableHeight),
      ui.Paint(),
    );

    canvas.drawImageRect(
      modifiedImage,
      ui.Rect.fromLTWH(0, 0, modifiedImage.width.toDouble(),
          modifiedImage.height.toDouble()),
      const ui.Rect.fromLTWH(padding * 3 + availableWidthPerImage + gap,
          padding, availableWidthPerImage, availableHeight),
      ui.Paint(),
    );

    print(
        "DADADADADAD ${gameSession.info.differences.length} ${gameSession.match.gamesIndex}");

    if (gameSession.mode == "classic") {
      print("Drawing found differences");
      for (int index = 0; index < differences.length; index++) {
        if (index == showDifference && blinkState >= 0) {
          print("CC - Show difference: $showDifference - $index");
          continue;
        } else if (found.contains(index)) {
          var diff = differences[index];
          for (var pos in diff) {
            var srcX = pos[0];
            var srcY = pos[1];
            var destX = pos[0] + 640 + 90;
            var destY = pos[1];

            var srcRect = Rect.fromLTWH(srcX.toDouble(), srcY.toDouble(), 2, 2);
            var dstRect =
                Rect.fromLTWH(destX.toDouble(), destY.toDouble(), 2, 2);

            canvas.drawImageRect(
              originalImage,
              srcRect,
              dstRect,
              Paint(),
            );
          }
        }
      }
    } else if (gameSession.mode == "time-limit") {
      print("CC - Differnece length ${differences.length}");
      print("CC - Differnece length ${gameSession.info.differences.length}");
      List<List<List<int>>> diff_ = gameSession.info.differences;
      for (int i = 0; i < diff_.length; i++) {
        print(
            "CC - ${gameSession.match.differenceIndex[gameSession.match.gamesIndex]}");
        if (i ==
            gameSession.match.differenceIndex[gameSession.match.gamesIndex]) {
          continue;
        }
        print("Drawing not differneces");
        var diff = diff_[i];
        for (var pos in diff) {
          var srcX = pos[0];
          var srcY = pos[1];
          var destX = pos[0] + 640 + 90;
          var destY = pos[1];

          var srcRect = Rect.fromLTWH(srcX.toDouble(), srcY.toDouble(), 2, 2);
          var dstRect = Rect.fromLTWH(destX.toDouble(), destY.toDouble(), 2, 2);

          canvas.drawImageRect(
            originalImage,
            srcRect,
            dstRect,
            Paint(),
          );
        }
      }
    }

    if (gameSession.mode == "classic" &&
        gameSession.specator &&
        gameSession.match.foundDifferencesIndex.isNotEmpty &&
        differences.isNotEmpty) {
      for (var foundDifference in gameSession.match.foundDifferencesIndex) {
        print("Drawing spectator differneces");
        var diff = differences[foundDifference];
        for (var pos in diff) {
          var srcX = pos[0];
          var srcY = pos[1];
          var destX = pos[0] + 640 + 90;
          var destY = pos[1];

          var srcRect = Rect.fromLTWH(srcX.toDouble(), srcY.toDouble(), 2, 2);
          var dstRect = Rect.fromLTWH(destX.toDouble(), destY.toDouble(), 2, 2);

          canvas.drawImageRect(
            originalImage,
            srcRect,
            dstRect,
            Paint(),
          );
        }
      }
    }

    if (isCheatMode && cheatBlinkVisible) {
      List<List<List<int>>> diff_ = gameSession.mode == "time-limit"
          ? gameSession.info.differences
          : differences;
      for (var diff in diff_) {
        for (var pos in diff) {
          if (gameSession.mode == "classic" &&
              found.contains(diff_.indexOf(diff))) {
            continue;
          }

          if (gameSession.mode == "time-limit" &&
              gameSession.match.differenceIndex[gameSession.match.gamesIndex] !=
                  diff_.indexOf(diff)) {
            continue;
          }

          var srcX = pos[0];
          var srcY = pos[1];

          // Copy pixel from modified image to original position
          var srcRect = Rect.fromLTWH(srcX.toDouble(), srcY.toDouble(), 2, 2);
          var dstRect = Rect.fromLTWH(srcX.toDouble(), srcY.toDouble(), 2, 2);
          canvas.drawImageRect(modifiedImage, srcRect, dstRect, Paint());

          // Copy pixel from original image to modified position (offset by image width and gap)
          var destX = srcX + 640 + 90;
          var destY = srcY;
          var modSrcRect =
              Rect.fromLTWH(destX.toDouble(), destY.toDouble(), 2, 2);
          var modDstRect =
              Rect.fromLTWH(destX.toDouble(), destY.toDouble(), 2, 2);
          canvas.drawImageRect(originalImage, srcRect, modDstRect, Paint());
        }
      }
    }

    if (showDifference >= 0 && blinkState >= 0) {
      if (showDifference < differences.length) {
        print("Blinkging differneces");
        var diff = differences[showDifference];
        for (var pos in diff) {
          var srcX = pos[0];
          var srcY = pos[1];

          var destX = pos[0] + 640 + 90;
          var destY = pos[1];

          if (pos[0] == diff[0][0]) {
            print("Difference SRC at: $srcX, $srcY");
            print("Difference DST at: $destX, $destY");
          }

          var srcRect = Rect.fromLTWH(srcX.toDouble(), srcY.toDouble(), 2, 2);
          var dstRect = Rect.fromLTWH(destX.toDouble(), destY.toDouble(), 2, 2);

          var imageToUse = blinkState == 0 ? originalImage : modifiedImage;
          canvas.drawImageRect(
            imageToUse,
            srcRect,
            dstRect,
            Paint(),
          );
        }
      }
    }

    // Draw the "ERROR" text if errorPosition is not null
    if (errorPosition != null) {
      const textSpan = TextSpan(
        text: 'ERROR',
        style: TextStyle(
          color: Colors.red,
          fontSize: 24,
        ),
      );
      final textPainter = TextPainter(
        text: textSpan,
        textDirection: TextDirection.ltr,
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(errorPosition!.x, errorPosition!.y));
      double rightImageX = errorPosition!.x + 640 + 90;
      textPainter.paint(canvas, Offset(rightImageX, errorPosition!.y));
    }

    if (previousCoordinates != null && currentCoordinates != null) {
      final Paint paint = Paint()
        ..color = getColorFromString(rectColor)
        ..strokeWidth = 2
        ..style = PaintingStyle.stroke;

      canvas.drawRect(
        Rect.fromPoints(
          Offset(previousCoordinates!.x, previousCoordinates!.y),
          Offset(currentCoordinates!.x, currentCoordinates!.y),
        ),
        paint,
      );

      double rightImageX = currentCoordinates!.x + 640 + 90;
      canvas.drawRect(
        Rect.fromPoints(
          Offset(previousCoordinates!.x + 640 + 90, previousCoordinates!.y),
          Offset(rightImageX, currentCoordinates!.y),
        ),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant GameImagesPainter oldDelegate) {
    // Return true if the difference to show or the blink state changes
    return oldDelegate.showDifference != showDifference ||
        oldDelegate.blinkState != blinkState ||
        oldDelegate.errorPosition != errorPosition ||
        oldDelegate.modifiedImage != modifiedImage ||
        oldDelegate.originalImage != originalImage ||
        oldDelegate.gameSession != gameSession ||
        oldDelegate.differences != differences ||
        oldDelegate.previousCoordinates != previousCoordinates ||
        oldDelegate.currentCoordinates != currentCoordinates ||
        oldDelegate.isCheatMode != isCheatMode ||
        oldDelegate.cheatBlinkVisible != cheatBlinkVisible;
  }
}

//////////////////////////////////////////////////////////////////////////
