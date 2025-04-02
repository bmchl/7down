import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/classes/AppLocalizations.dart';
import 'package:flutterapp/components/chat_drawer.dart';
import 'package:flutterapp/screens/Account.dart';
import 'package:flutterapp/screens/Settings.dart';
import 'package:flutterapp/screens/auth_wrapper.dart';
import 'package:flutterapp/screens/current_matches_page.dart';
import 'package:flutterapp/screens/select.dart';
import 'package:flutterapp/screens/time_limit_lobby.dart';

class NavRailExample extends StatefulWidget {
  const NavRailExample({super.key});

  @override
  State<NavRailExample> createState() => _NavRailExampleState();
}

class _NavRailExampleState extends State<NavRailExample> {
  int selectedIndex = 0;
  NavigationRailLabelType labelType = NavigationRailLabelType.all;
  double groupAlignment = -1.0;
  final GlobalKey<ScaffoldState> scaffoldKey = GlobalKey<ScaffoldState>();

  void openDrawer() {
    scaffoldKey.currentState!.openEndDrawer();
  }

  bool isExtended = false;

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    final DatabaseReference userRef =
        FirebaseDatabase.instance.reference().child('users');
    return Scaffold(
        key: scaffoldKey,
        floatingActionButton: FloatingActionButton(
          onPressed: openDrawer,
          child: const Icon(Icons.chat),
        ),
        endDrawer: const AuthenticationWrapper(child: ChatDrawer()),
        body: SafeArea(
          bottom: false,
          top: false,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              NavigationRail(
                extended: isExtended,
                trailing: Column(children: [
                  IconButton(
                    icon: const Icon(Icons.view_sidebar),
                    isSelected: isExtended,
                    onPressed: () {
                      setState(() {
                        isExtended = !isExtended;
                      });
                    },
                  ),
                  StreamBuilder(
                    stream: userRef
                        .orderByChild('isLoggedIn')
                        .equalTo(true)
                        .onValue,
                    builder: (context, AsyncSnapshot snapshot) {
                      if (snapshot.hasData &&
                          snapshot.data!.snapshot.value != null) {
                        int onlineUsersCount =
                            (snapshot.data!.snapshot.value as Map).length;
                        return Chip(
                          label: Row(
                            children: [
                              const Icon(Icons.person, size: 20),
                              const Icon(Icons.circle,
                                  color: Colors.green, size: 10),
                              const SizedBox(width: 4),
                              Text('$onlineUsersCount',
                                  style: const TextStyle(fontSize: 16)),
                            ],
                          ),

                          // label: Text('Online users: $onlineUsersCount'),
                        );
                      } else {
                        return const SizedBox();
                      }
                    },
                  )
                ]),
                leading: Padding(
                  padding: const EdgeInsets.all(8),
                  child: SizedBox(
                      width: 100,
                      child: Padding(
                          padding: const EdgeInsets.all(5),
                          child: Image(
                            image: AssetImage(
                                // white logo if dark mode, black logo if light mode
                                Theme.of(context).brightness == Brightness.dark
                                    ? 'assets/logo-white.png'
                                    : 'assets/logo-black.png'),
                          ))),
                ),
                selectedIndex: selectedIndex,
                onDestinationSelected: (int index) {
                  setState(() {
                    selectedIndex = index;
                  });
                },
                destinations: [
                  NavigationRailDestination(
                      icon: const Icon(Icons.house_rounded),
                      label: Text(AppLocalizations.of(context)!
                          .translate('Classic Mode'))),
                  NavigationRailDestination(
                      icon: const Icon(Icons.timer),
                      label: Text(AppLocalizations.of(context)!
                          .translate('Time Limited Mode'))),
                  NavigationRailDestination(
                      icon: const Icon(Icons.visibility),
                      label: Text(
                          AppLocalizations.of(context)!.translate('Spectate'))),
                  NavigationRailDestination(
                      icon: const Icon(Icons.person),
                      label: Text(
                          AppLocalizations.of(context)!.translate('Account'))),
                  NavigationRailDestination(
                      icon: const Icon(Icons.settings),
                      label: Text(
                          AppLocalizations.of(context)!.translate('Settings')))
                ],
              ),
              const VerticalDivider(thickness: 1, width: 1),
              Expanded(
                  child: [
                const Selection(),
                const AuthenticationWrapper(child: TimeLimitLobby()),
                const AuthenticationWrapper(child: CurrentMatches()),
                const AuthenticationWrapper(child: AccountPage()),
                const Settings(),
              ][selectedIndex]),
            ],
          ),
        ));
  }
}
