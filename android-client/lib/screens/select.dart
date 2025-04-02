import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';
import 'package:flutterapp/classes/game_info.dart';
import 'package:flutterapp/components/game_item.dart';
import 'package:flutterapp/services/game_info_service.dart';

enum SortingOptions { byPlays, byLikes, byDate }

class SelectionPage extends State<Selection> {
  List<GameInfo> games = [];
  bool isLoading = true;
  SortingOptions selectedSortingOption = SortingOptions.byPlays;
  bool isAscending = true;

  final GlobalKey<RefreshIndicatorState> _refreshIndicatorKey =
      GlobalKey<RefreshIndicatorState>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text(AppLocalizations.of(context)!.translate('Classic Games')),
          actions: [
            DropdownButton<SortingOptions>(
              value: selectedSortingOption,
              onChanged: (SortingOptions? newValue) {
                setState(() {
                  selectedSortingOption = newValue!;
                  _sortGames();
                });
              },
              items: [
                DropdownMenuItem<SortingOptions>(
                  value: SortingOptions.byPlays,
                  child: Row(children: [
                    const Icon(Icons.bar_chart, size: 20, color: Colors.black),
                    const SizedBox(width: 10),
                    Text(AppLocalizations.of(context)!
                        .translate('Sort by Plays'))
                  ]),
                ),
                DropdownMenuItem<SortingOptions>(
                  value: SortingOptions.byLikes,
                  child: Row(children: [
                    const Icon(Icons.thumbs_up_down,
                        size: 20, color: Colors.black),
                    const SizedBox(width: 10),
                    Text(AppLocalizations.of(context)!
                        .translate('Sort by Likes'))
                  ]),
                ),
                DropdownMenuItem<SortingOptions>(
                    value: SortingOptions.byDate,
                    child: Row(children: [
                      const Icon(Icons.calendar_month,
                          size: 20, color: Colors.black),
                      const SizedBox(width: 10),
                      Text(AppLocalizations.of(context)!
                          .translate('Sort by Date'))
                    ])),
              ],
            ),
            IconButton(
              icon:
                  Icon(isAscending ? Icons.arrow_upward : Icons.arrow_downward),
              onPressed: () {
                setState(() {
                  isAscending = !isAscending;
                  _sortGames();
                });
              },
            ),
          ],
        ),
        body: Padding(
          padding: const EdgeInsets.only(left: 30, right: 30),
          child: RefreshIndicator(
            key: _refreshIndicatorKey,
            onRefresh: _refreshGames,
            child: isLoading
                ? const Center(child: CircularProgressIndicator())
                : (games.isNotEmpty
                    ? GridView.builder(
                        itemCount: games.length,
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 30,
                          mainAxisSpacing: 30,
                          childAspectRatio: 2.3,
                        ),
                        itemBuilder: (context, index) {
                          return GameItem(
                            gameInfo: games[index],
                          );
                        },
                      )
                    : Center(
                        child: Text(AppLocalizations.of(context)!
                            .translate('No Games')))),
          ),
        ));
  }

  @override
  void initState() {
    super.initState();
    _refreshGames();
  }

  Future<void> _refreshGames() async {
    setState(() {
      isLoading = true;
    });
    await getGames();
    setState(() {
      isLoading = false;
    });
  }

  Future<void> getGames() async {
    List<GameInfo> gamesRes = [];
    try {
      GameInfoService gameInfoService = GameInfoService();
      gamesRes = await gameInfoService.fetchGames();
      setState(() {
        games = gamesRes;
      });
    } catch (e) {
      print(e);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Error fetching games'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _sortGames() {
    setState(() {
      switch (selectedSortingOption) {
        case SortingOptions.byPlays:
          games.sort((a, b) => isAscending
              ? a.plays.compareTo(b.plays)
              : b.plays.compareTo(a.plays));
          break;
        case SortingOptions.byLikes:
          games.sort((a, b) => isAscending
              ? a.likes.compareTo(b.likes)
              : b.likes.compareTo(a.likes));
          break;
        case SortingOptions.byDate:
          games.sort((a, b) => isAscending
              ? a.creationDate!.compareTo(b.creationDate!)
              : b.creationDate!.compareTo(a.creationDate!));
          break;
      }
    });
  }
}

class Selection extends StatefulWidget {
  const Selection({Key? key}) : super(key: key);
  @override
  State<Selection> createState() => SelectionPage();
}
