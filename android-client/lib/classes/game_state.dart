import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

class GameState with ChangeNotifier {
  ui.Image? originalImage;
  ui.Image? modifiedImage;
  bool isImagesLoaded = false;
  final List<List<List<int>>> differences;

  GameState(this.differences);

  Future<void> loadImages(String originalUrl, String modifiedUrl) async {
    originalImage = await _loadImageFromNetwork(originalUrl);
    modifiedImage = await _loadImageFromNetwork(modifiedUrl);
    isImagesLoaded = true;
    notifyListeners();
  }

  Future<void> reloadImages(List<String> newImages) async {
    print("Reloading images");
    await loadImages(newImages[0], newImages[1]);
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
}
